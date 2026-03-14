// app/Controllers/Http/PurchaseOrdersController.ts
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { DateTime } from 'luxon'
import Database from '@ioc:Adonis/Lucid/Database'
import PurchaseOrder from 'App/Models/PurchaseOrder'
import WarehouseStock from 'App/Models/WarehouseStock' // สมมติว่าคุณมี Model นี้

export default class PurchaseOrdersController {

  // GET /purchase-orders
  public async index({ request, auth }: HttpContextContract) {
    console.log('🟢 API DO index', request.all())
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 10)
    const user = auth.user!

    let query = PurchaseOrder.query()
      .preload('creator')
      .preload('approver')
      .preload('items', (itemsQuery) => {
        itemsQuery.preload('product')
      })
      .orderBy('created_at', 'desc')

    if (user.role !== 'admin') {
      query = query.where('user_id', user.id)
    }

    // *** เพิ่ม .paginate() ***
    const result = await query.paginate(page, perPage)
    console.log('🔴 API RESULT index', result)
    return result
  }

  // POST /purchase-orders
  public async store({ request, auth, response }: HttpContextContract) {
    console.log('🟢 API DO store', request.all())
    const { supplier_name, notes, items } = request.only(['supplier_name', 'notes', 'items'])
    const user = auth.user!

    // ใช้ Transaction เพื่อความปลอดภัย
    const trx = await Database.transaction()
    try {
      // 1. สร้าง PO หลัก
      const po = new PurchaseOrder().useTransaction(trx)
      po.fill({
        supplier_name,
        notes,
        userId: user.id,
        status: 'Pending',
      })
      await po.save()

      // 2. สร้างรายการ PO Items
      await po.related('items').createMany(items, trx) // items ต้องมี { product_id, quantity, cost_price }
      
      await trx.commit()
      const result = await po.load('items')
      console.log('🔴 API RESULT store', result)
      return result

    } catch (error) {
      await trx.rollback()
      console.log('🔴 API RESULT store ERROR', error)
      return response.status(500).send({ message: 'Error creating PO', error: error.message })
    }
  }

  // GET /purchase-orders/:id
  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const result = await PurchaseOrder.query()
      .where('id', params.id)
      .preload('creator')
      .preload('approver')
      .preload('items', (itemsQuery) => itemsQuery.preload('product'))
      .firstOrFail()
    console.log('🔴 API RESULT show', result)
    return result
  }

  // PUT /purchase-orders/:id (สำหรับแก้ไข)
  public async update({ params, request, response, auth }: HttpContextContract) {
    console.log('🟢 API DO update', { params, body: request.all() })
    const po = await PurchaseOrder.findOrFail(params.id)

    // ตรวจสอบสิทธิ์ (Admin หรือ เจ้าของ PO ที่ยังไม่อนุมัติ)
    if (auth.user!.role !== 'admin' && auth.user!.id !== po.userId) {
      console.log('🔴 API RESULT update ERROR', 'You cannot edit this PO')
      return response.forbidden({ message: 'You cannot edit this PO' })
    }
    if (po.status !== 'Pending') {
      console.log('🔴 API RESULT update ERROR', 'Cannot edit an approved or cancelled PO')
      return response.badRequest({ message: 'Cannot edit an approved or cancelled PO' })
    }

    const { supplier_name, notes, items } = request.only(['supplier_name', 'notes', 'items'])

    const trx = await Database.transaction()
    try {
      po.useTransaction(trx)
      po.merge({ supplier_name, notes })
      await po.save()

      // ลบรายการเก่าและสร้างใหม่ (วิธีที่ง่ายที่สุด)
      await po.related('items').query().delete()
      await po.related('items').createMany(items, trx)

      await trx.commit()
      const result = await po.load('items')
      console.log('🔴 API RESULT update', result)
      return result

    } catch (error) {
      await trx.rollback()
      console.log('🔴 API RESULT update ERROR', error)
      return response.status(500).send({ message: 'Error updating PO', error: error.message })
    }
  }

  // PATCH /purchase-orders/:id/approve (สำหรับ Admin)
 public async approve({ params, response, auth }: HttpContextContract) {
    console.log('🟢 API DO approve', params)
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Only admins can approve POs' })
    }

    const po = await PurchaseOrder.findOrFail(params.id)
    if (po.status !== 'Pending') {
      return response.badRequest({ message: 'PO has already been processed' })
    }

    await po.load('items')

    const trx = await Database.transaction()
    try {
      po.useTransaction(trx)
      po.status = 'Approved'
      po.approvedBy = auth.user!.id
      po.approvedAt = DateTime.now()
      await po.save()


      for (const item of po.items) {

        let stock = await WarehouseStock.query({ client: trx })
          .where('productId', item.productId) 
          .first()

        if (stock) {
          // ถ้ามี stock เดิม
          stock.quantity += item.quantity
          stock.updatedBy = auth.user!.id
          await stock.save()
        } else {
          stock = await WarehouseStock.create({
            productId: item.productId,
            quantity: item.quantity,
            updatedBy: auth.user!.id,
          }, { client: trx })
        }
      }

      await trx.commit()
      const result = { message: 'Purchase Order approved and stock updated!', po }
      console.log('🔴 API RESULT approve', result)
      return response.ok(result)

    } catch (error) {
      await trx.rollback()
      console.log('🔴 API RESULT approve ERROR', error)
      return response.status(500).send({ message: 'Error approving PO', error: error.message })
    }
  }

  // DELETE /purchase-orders/:id (สำหรับยกเลิก)
  public async destroy({ params, response, auth }: HttpContextContract) {
    console.log('🟢 API DO destroy', params)
    const po = await PurchaseOrder.findOrFail(params.id)
    
    if (auth.user!.role !== 'admin' && auth.user!.id !== po.userId) {
      console.log('🔴 API RESULT destroy ERROR', 'You cannot cancel this PO')
      return response.forbidden({ message: 'You cannot cancel this PO' })
    }
    
    po.status = 'Cancelled'
    await po.save()
    
    const result = { message: 'Purchase Order has been cancelled' }
    console.log('🔴 API RESULT destroy', result)
    return response.ok(result)
  }
}