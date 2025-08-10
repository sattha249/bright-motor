
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

  public async import({ request, auth , response }: HttpContextContract) {
    const { products } = request.only(['products'])
    const user = auth.user!
    if (user.role !== 'admin' && user.role !== 'warehouse') {
       return response.status(500).json({success: false, message: 'คุณไม่มีสิทธิ์ในการนำเข้าสินค้า' })
    }
    try{
    let createdStocks = []
    for (const product of products) {
    const stock = await WarehouseStock.firstOrCreate(
      { productId : product.productId },
    )
    stock.updatedBy = user.id
    stock.quantity += product.quantity
    await stock.save()

    createdStocks.push({
      productId: product.productId,
      quantity: product.quantity,
      sourceType: 'warehouse',
      sourceId: 1, 
      targetType: 'warehouse',
      targetId: 1, 
      type: 'import',
      userId: user.id,
    })

    }
    await StockLog.createMany(createdStocks)
    return { success: true, message: 'นำเข้าสินค้าเรียบร้อยแล้ว' ,detail : createdStocks }
    }catch(err){
      console.log(err)
      return response.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าสินค้า' })
    }
  }

  public async moveToTruck({ request,response, auth }: HttpContextContract) {
    const { products, truckId } = request.only(['products', 'truckId'])
    if (auth.user?.role == 'truck') {
      return response.status(401).json({success:false, message: 'คุณไม่มีสิทธิ์ในการย้ายสินค้า' })
    }
    try{
    let createdStocks  = []
    for (const product of products) {
    // TODO make it to many items
    const warehouseStock = await WarehouseStock.query()
      .where('product_id', product.productId)
      .firstOrFail()

    if (warehouseStock.quantity < product.quantity) {
      return response.status(400).json({success:false, message: 'ไม่สามารถย้ายสินค้าได้ เนื่องจากปริมาณในโกดังไม่เพียงพอ' })
    }


    // เพิ่มสินค้าลงในรถ
    const truckStock = await TruckStock.query()
      .where('truck_id', truckId)
      .where('product_id', product.productId)
      .first()

    // ลดสินค้าในโกดัง
    warehouseStock.quantity -= product.quantity
    await warehouseStock.save()

    if (truckStock) {
      console.log('truckStock', truckStock)
      truckStock.quantity += product.quantity
      await truckStock.save()
    } else {
      await TruckStock.create({
        truckId,
        productId:product.productId,
        quantity:product.quantity,
      })
    }

    createdStocks.push({
      productId: product.productId,
      quantity: product.quantity,
      targetId: truckId,
      sourceType: 'warehouse',
      sourceId: warehouseStock.id,
      targetType: 'truck',
      targetId: truckId,
      type: 'move',
      userId: auth.user!.id,
    })

  }

    await StockLog.createMany(createdStocks)

    return response.status(200).json({success:true, message: 'ย้ายสินค้าไปยังรถสำเร็จ' })
    } catch (error) {
    console.error('Error moving products to truck:', error)
    return response.status(500).json({success:false, message: 'เกิดข้อผิดพลาดในการย้ายสินค้า' })
    }
  }

}
