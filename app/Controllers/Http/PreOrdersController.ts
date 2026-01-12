import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import PreOrder from 'App/Models/PreOrder'
import WarehouseStock from 'App/Models/WarehouseStock'
import PreOrderItem from 'App/Models/PreOrderItem'
import TruckStock from 'App/Models/TruckStock' // คุณต้องมี Model นี้สำหรับสต็อกบนรถ

export default class PreOrdersController {

  // GET /pre-orders (List Dashboard)
  public async index({ request }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const status = request.input('status') // Filter status
    const search = request.input('search') // ค้นหาด้วยเลขบิล หรือ ชื่อลูกค้า
    const query = PreOrder.query()
      .preload('truck')
      .preload('customer')
      .preload('user')
      .orderBy('created_at', 'desc')

    if (status) {
      query.where('status', status)
    }
    if (request.input('truckId')) {
      query.where('truck_id', request.input('truckId'))
    }
    if (search) {
      //preorder.bill no , customer.name and truck.plate_number
      query.where((q) => {
        q.where('bill_no', 'like', `%${search}%`)
        .orWhereHas('customer', (customerQuery) => {
          customerQuery.where('name', 'like', `%${search}%`)
        })
        .orWhereHas('truck', (truckQuery) => {
          truckQuery.where('plate_number', 'like', `%${search}%`)
        })
      })
      
    }
    return await query.paginate(page, limit)
  }

  // GET /pre-orders/:id (Detail)
  public async show({ params }: HttpContextContract) {
    return await PreOrder.query()
      .where('id', params.id)
      .preload('items', (q) => q.preload('product'))
      .preload('truck')
      .preload('customer')
      .firstOrFail()
  }

  // POST /pre-orders (Create & Transfer Stock)
  public async store({ request, auth, response }: HttpContextContract) {
    const data = request.all()
    // data structure same as sell-logs: truckId, customerId, items[], ...

    const trx = await Database.transaction()

    try {
      // 1. Create PreOrder Header
      const preOrder = new PreOrder()
      preOrder.fill({
        billNo: `BMT-${Date.now()}-${data.truckId}-${data.customerId}`, // Gen เลขบิลตามสูตรคุณ
        truckId: data.truckId,
        customerId: data.customerId,
        userId: auth.user!.id,
        status: 'Pending', // รอรถ Sync
        totalPrice: data.totalPrice, // คำนวณยอดมาจาก front หรือคำนวณใหม่ที่นี่
        totalDiscount: data.totalDiscount,
        totalSoldPrice: data.totalSoldPrice,
        isCredit: data.isCredit
      })
      
      preOrder.useTransaction(trx)
      await preOrder.save()

      // 2. Process Items & Move Stock
      for (const item of data.items) {
        // 2.1 Create Item
        await preOrder.related('items').create({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          soldPrice: item.soldPrice,
          isPaid: item.isPaid
        }, { client: trx })

        // 2.2 DEDUCT from Warehouse (ตัดจากโกดัง)
        const warehouseStock = await WarehouseStock.query({ client: trx })
          .where('product_id', item.productId)
          .first()

        if (!warehouseStock || warehouseStock.quantity < item.quantity) {
          throw new Error(`สินค้า ID ${item.productId} ในโกดังไม่พอ`)
        }
        warehouseStock.quantity -= item.quantity
        await warehouseStock.save()

        // 2.3 ADD to Truck (เพิ่มเข้ามารถ)
        // ต้องเช็คว่ารถคันนี้มีสินค้านี้หรือยัง ถ้าไม่มีสร้างใหม่ ถ้ามีบวกเพิ่ม
        let truckStock = await TruckStock.query({ client: trx })
          .where('truck_id', data.truckId)
          .andWhere('product_id', item.productId)
          .first()

        if (truckStock) {
          truckStock.quantity += item.quantity
          await truckStock.save()
        } else {
          await TruckStock.create({
            truckId: data.truckId,
            productId: item.productId,
            quantity: item.quantity
          }, { client: trx })
        }
      }

      await trx.commit()
      return response.created(preOrder)

    } catch (error) {
      await trx.rollback()
      return response.badRequest({ message: error.message })
    }
  }

  // POST /pre-orders/:id/cancel (Cancel & Reverse Stock)
  public async cancel({ params, response }: HttpContextContract) {
    const preOrder = await PreOrder.findOrFail(params.id)

    if (preOrder.status !== 'Pending') {
      return response.badRequest({ message: 'ยกเลิกได้เฉพาะรายการที่ยังไม่ Sync/Completed เท่านั้น' })
    }

    await preOrder.load('items')
    const trx = await Database.transaction()

    try {
      // 1. Update Status
      preOrder.useTransaction(trx)
      preOrder.status = 'Cancelled'
      await preOrder.save()

      // 2. Reverse Stock (Truck -> Warehouse)
      for (const item of preOrder.items) {
        // 2.1 Deduct from Truck
        const truckStock = await TruckStock.query({ client: trx })
          .where('truck_id', preOrder.truckId)
          .andWhere('product_id', item.productId)
          .first()
        
        if (truckStock) {
            // เช็คว่าของในรถพอให้ดึงกลับไหม (เผื่อกรณีผิดพลาดอื่น)
            if(truckStock.quantity >= item.quantity){
                 truckStock.quantity -= item.quantity
                 await truckStock.save()
            } else {
                 // กรณีของหายไปไหนไม่รู้ ให้ลบเท่าที่มี หรือ throw error
                 truckStock.quantity = 0 
                 await truckStock.save()
            }
        }

        // 2.2 Add back to Warehouse
        const warehouseStock = await WarehouseStock.query({ client: trx })
          .where('product_id', item.productId)
          .first()
        
        if (warehouseStock) {
            warehouseStock.quantity += item.quantity
            await warehouseStock.save()
        }
      }

      await trx.commit()
      return response.ok({ message: 'ยกเลิกใบงานและดึงของกลับโกดังเรียบร้อย' })

    } catch (error) {
      await trx.rollback()
      return response.badRequest({ message: error.message })
    }
  }

  public async confirm({ params, response }: HttpContextContract) {
    const preOrder = await PreOrder.findOrFail(params.id)

    if (preOrder.status !== 'Pending') {
      return response.badRequest({ message: 'ยืนยันได้เฉพาะรายการที่ยังไม่ Sync/Completed เท่านั้น' })
    }

    preOrder.status = 'Completed'
    await preOrder.save()

    return response.ok({ message: 'ยืนยันการจัดส่งเรียบร้อย' })
  }

  // GET /pre-orders/sync/:truckId (สำหรับรถดึงข้อมูลใบงาน) ทำเผื่อไว้ก่อนจ้า
  // public async syncForTruck({ params }: HttpContextContract) {
  //   const preOrders = await PreOrder.query()
  //     .where('truck_id', params.truckId)
  //     .andWhere('status', 'Pending')
  //     .preload('items', (q) => q.preload('product'))
  //     .preload('customer')
  //     .orderBy('created_at', 'asc')
  //   return preOrders
  // }


  public async update({ params, request, response }: HttpContextContract) {
  const trx = await Database.transaction()
  try {
    const preOrder = await PreOrder.findOrFail(params.id)
    // 1. คืนสต็อกเดิมกลับเข้า Warehouse (Revert Stock)
    const oldItems = await PreOrderItem.query().where('pre_order_id', preOrder.id)
    for (const item of oldItems) {
      const stock = await WarehouseStock.query()
        .where('product_id', item.productId)
        .first()
      
      if (stock) {
        stock.quantity += item.quantity // คืนยอด
        await stock.save() // หรือ use transaction: stock.useTransaction(trx).save()
      }
    }

    // 2. ลบรายการสินค้าเดิมออก
    await PreOrderItem.query().where('pre_order_id', preOrder.id).delete()

    // 3. รับข้อมูลใหม่
    const { truckId, customerId, isCredit, items, totalSoldPrice } = request.all()

    // 4. อัปเดตข้อมูล Header
    preOrder.truckId = truckId
    preOrder.customerId = customerId
    preOrder.isCredit = isCredit
    preOrder.totalSoldPrice = totalSoldPrice
    preOrder.totalPrice = totalSoldPrice // สมมติว่าเท่ากันถ้าไม่มีส่วนลดท้ายบิล
    await preOrder.save()

    // 5. สร้างรายการใหม่ และ ตัดสต็อกใหม่ (Process New Items)
    for (const item of items) {
      // ตัดสต็อกใหม่
      const stock = await WarehouseStock.query()
        .where('product_id', item.productId)
        .first()

      if (!stock || stock.quantity < item.quantity) {
        throw new Error(`สินค้า ${item.description} มีไม่พอในคลัง (เหลือ ${stock?.quantity || 0})`)
      }

      stock.quantity -= item.quantity
      await stock.save()

      // สร้าง Item ใหม่
      await PreOrderItem.create({
        preOrderId: preOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        soldPrice: item.soldPrice,
        discount: item.discount,
        isPaid: item.isPaid
      })
    }

    await trx.commit()
    return response.json({ message: 'Update success', id: preOrder.id })

  } catch (error) {
    await trx.rollback()
    return response.status(500).json({ message: error.message })
  }
}
}