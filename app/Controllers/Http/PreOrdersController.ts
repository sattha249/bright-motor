import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import PreOrder from 'App/Models/PreOrder'
import WarehouseStock from 'App/Models/WarehouseStock'
import TruckStock from 'App/Models/TruckStock' // คุณต้องมี Model นี้สำหรับสต็อกบนรถ

export default class PreOrdersController {

  // GET /pre-orders (List Dashboard)
  public async index({ request }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const status = request.input('status') // Filter status

    const query = PreOrder.query()
      .preload('truck')
      .preload('customer')
      .preload('user')
      .orderBy('created_at', 'desc')

    if (status) {
      query.where('status', status)
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
          soldPrice: item.sold_price,
          isPaid: item.is_paid
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
}