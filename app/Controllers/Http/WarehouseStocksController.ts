// 📁 app/Controllers/Http/WarehouseStocksController.ts
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WarehouseStock from 'App/Models/WarehouseStock'
import TruckStock from 'App/Models/TruckStock'
import StockLog from 'App/Models/StockLog'

export default class WarehouseStocksController {
  public async index({ request }) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '').trim()

    const query = WarehouseStock.query().preload('product')

    if (search) {
      query.whereHas('product', (builder) => {
        builder.whereILike('name', `%${search}%`)
      })
    }

    return await query.paginate(page, limit)
  }

  public async import({ request, auth }: HttpContextContract) {
    const { productId, quantity } = request.only(['productId', 'quantity'])
    const user = auth.user!

    const stock = await WarehouseStock.firstOrCreate(
      { productId },
      { quantity: 0 }
    )

    stock.quantity += quantity
    await stock.save()

    await StockLog.create({
      productId,
      quantity,
      sourceType: 'warehouse',
      sourceId: 1,
      targetType: 'warehouse',
      targetId: 1,
      type: 'import',
      userId: user.id,
    })

    return stock
  }

  public async moveToTruck({ request,response, auth }: HttpContextContract) {
    const { productId, quantity, truckId } = request.only(['productId', 'quantity', 'truckId'])
    if (auth.user?.role == 'truck') {
      return response.status(401).json({success:false, message: 'คุณไม่มีสิทธิ์ในการย้ายสินค้า' })
    }

    const warehouseStock = await WarehouseStock.query()
      .where('product_id', productId)
      .firstOrFail()

    if (warehouseStock.quantity < quantity) {
      return response.status(400).json({success:false, message: 'ไม่สามารถย้ายสินค้าได้ เนื่องจากปริมาณในโกดังไม่เพียงพอ' })
    }


    // เพิ่มสินค้าลงในรถ
    const truckStock = await TruckStock.query()
      .where('truck_id', truckId)
      .where('product_id', productId)
      .first()

    // ลดสินค้าในโกดัง
    warehouseStock.quantity -= quantity
    await warehouseStock.save()

    if (truckStock) {
      console.log('truckStock', truckStock)
      truckStock.quantity += quantity
      await truckStock.save()
    } else {
      await TruckStock.create({
        truckId,
        productId,
        quantity,
      })
    }

    // บันทึก log
    await StockLog.create({
      productId,
      quantity,
      sourceType: 'warehouse',
      sourceId: warehouseStock.id,
      targetType: 'truck',
      targetId: truckId,
      type: 'move',
      userId: auth.user!.id,
    })

    return response.status(200).json({success:true, message: 'ย้ายสินค้าไปยังรถสำเร็จ' })
  }
  
}
