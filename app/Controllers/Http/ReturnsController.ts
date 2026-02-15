import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import TruckStock from 'App/Models/TruckStock'
import ReturnLog from 'App/Models/ReturnLog'
import ReturnLogItem from 'App/Models/ReturnLogItem'
import StockLog from 'App/Models/StockLog'

export default class ReturnController {

  public async returnItems({ request, response, auth, params }: HttpContextContract) {
    const sellLogId = params.id
    const { items, reason } = request.only(['items', 'reason'])
    const user = auth.user

    if (!user) return response.unauthorized('Please login')

    // เริ่ม Transaction
    const trx = await Database.transaction()

    try {
      const sellLog = await SellLog.findOrFail(sellLogId)
      
      // 1. สร้าง Header ใบรับคืน
      const returnLog = new ReturnLog()
      returnLog.sellLogId = sellLog.id
      returnLog.truckId = sellLog.truckId
      returnLog.userId = user.id
      returnLog.reason = reason
      returnLog.totalRefundAmount = 0
      
      returnLog.useTransaction(trx)
      await returnLog.save()

      let totalRefund = 0

      // 2. Loop รายการ
      for (const item of items) {
        const sellLogItem = await SellLogItem.findOrFail(item.sell_log_item_id)
        
        const returnQty = Number(item.quantity)
        const soldQty = Number(sellLogItem.quantity)
        const returnedQty = Number(sellLogItem.returnedQuantity || 0)

        // Validation
        if (returnQty > (soldQty - returnedQty)) {
          throw new Error(`สินค้า ${sellLogItem.productId} คืนเกินจำนวนที่เหลือ`)
        }

        // A. อัปเดต Sell Log Item (คืนแล้ว)
        sellLogItem.returnedQuantity = returnedQty + returnQty
        sellLogItem.useTransaction(trx)
        await sellLogItem.save()

        // B. อัปเดต Stock รถ (เพิ่มสต็อกกลับเข้าไป)
        const truckStock = await TruckStock.query()
          .where('truck_id', sellLog.truckId)
          .where('product_id', sellLogItem.productId)
          .first()

        if (truckStock) {
          truckStock.quantity += returnQty
          truckStock.useTransaction(trx)
          await truckStock.save()
        } else {
          await TruckStock.create({
            truckId: sellLog.truckId,
            productId: sellLogItem.productId,
            quantity: returnQty
          }, { client: trx })
        }

        // C. สร้าง Stock Log (ตาม Schema ใหม่ของคุณ)
        await StockLog.create({
          productId: sellLogItem.productId,
          quantity: returnQty,
          
          // Source: เนื่องจาก Enum ไม่มี 'customer' และของเข้ามาที่รถ
          // เราจึงใช้ 'truck' เป็นตัวระบุ Context (หรือใช้ warehouse ถ้าคืนเข้า warehouse)
          sourceType: 'truck', 
          sourceId: sellLog.truckId,

          // Target: ของวิ่งเข้า 'truck'
          targetType: 'truck',
          targetId: sellLog.truckId,

          // Type: ระบุว่าเป็นการรับคืน
          type: 'return',
          
          userId: user.id
        }, { client: trx })

        // D. สร้าง Detail ใบรับคืน
        await ReturnLogItem.create({
          returnLogId: returnLog.id,
          productId: sellLogItem.productId,
          quantity: returnQty,
          refundPrice: item.refund_price
        }, { client: trx })

        totalRefund += (returnQty * Number(item.refund_price))
      }

      // 3. Update ยอดเงินรวม
      returnLog.totalRefundAmount = totalRefund
      await returnLog.save()

      await trx.commit()

      return response.json({ message: 'Success', returnLog })

    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.badRequest({ message: error.message || 'Error processing return' })
    }
  }
}