
// 📁 app/Controllers/Http/WarehouseStocksController.ts
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WarehouseStock from 'App/Models/WarehouseStock'
import TruckStock from 'App/Models/TruckStock'
import StockLog from 'App/Models/StockLog'

export default class WarehouseStocksController {
  public async index({ request }) {
    console.log('🟢 API DO index', request.all())
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const orderBy = request.input('orderBy','quantity')
    const sort = request.input('sort','asc')
    const search = request.input('search', '').trim()
    const query = WarehouseStock.query().preload('product')

    if (search) {
      query.whereHas('product', (builder) => {
        builder
        .whereILike('description', `%${search}%`)
         .orWhereILike('category', `%${search}%`)
         .orWhereILike('brand', `%${search}%`)
         .orWhereILike('model', `%${search}%`)
      })
    }
    query.orderBy(orderBy,sort)
    const result = await query.paginate(page, limit)
    console.log('🔴 API RESULT index', result)
    return result
  }

  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const result = await WarehouseStock.query().where('product_id', params.productId).preload('product')
    console.log('🔴 API RESULT show', result)
    return result
  }

  public async import({ request, auth , response }: HttpContextContract) {
    console.log('🟢 API DO import', request.all())
    const { products } = request.only(['products'])
    const user = auth.user!
    if (user.role !== 'admin' && user.role !== 'warehouse') {
       const errorResult = {success: false, message: 'คุณไม่มีสิทธิ์ในการนำเข้าสินค้า' }
       console.log('🔴 API RESULT import ERROR', errorResult)
       return response.status(500).json(errorResult)
    }
    try{
    let createdStocks = []
    for (const product of products) {
    const stock = await WarehouseStock.firstOrCreate(
      { productId : product.productId },
    )
    stock.updatedBy = user.id
    let quantity = stock.quantity || 0
    stock.quantity = quantity + product.quantity
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
    const result = { success: true, message: 'นำเข้าสินค้าเรียบร้อยแล้ว' ,detail : createdStocks }
    console.log('🔴 API RESULT import', result)
    return result
    }catch(err){
      console.log(err)
      const errorResult = { success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าสินค้า' }
      console.log('🔴 API RESULT import ERROR', err)
      return response.status(500).json(errorResult)
    }
  }

  public async moveToTruck({ request,response, auth }: HttpContextContract) {
    console.log('🟢 API DO moveToTruck', request.all())
    const { products, truckId } = request.only(['products', 'truckId'])
    if (auth.user?.role == 'truck') {
      const errorResult = {success:false, message: 'คุณไม่มีสิทธิ์ในการย้ายสินค้า' }
      console.log('🔴 API RESULT moveToTruck ERROR', errorResult)
      return response.status(401).json(errorResult)
    }
    try{
    let createdStocks  = []
    for (const product of products) {
    // TODO make it to many items
    const warehouseStock = await WarehouseStock.query()
      .where('product_id', product.productId)
      .firstOrFail()
    console.log('[moveToTruck] product',product.productId, 'warehouseStock of product', warehouseStock.quantity , 'requested quantity', product.quantity)
    if (warehouseStock.quantity < product.quantity) {
      const errorResult = {success:false, message: 'ไม่สามารถย้ายสินค้าได้ เนื่องจากปริมาณในโกดังไม่เพียงพอ' }
      console.log('🔴 API RESULT moveToTruck ERROR', errorResult)
      return response.status(400).json(errorResult)
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

    const result = {success:true, message: 'ย้ายสินค้าไปยังรถสำเร็จ' }
    console.log('🔴 API RESULT moveToTruck', result)
    return response.status(200).json(result)
    } catch (error) {
    console.error('Error moving products to truck:', error)
    console.log('🔴 API RESULT moveToTruck ERROR', error)
    return response.status(500).json({success:false, message: 'เกิดข้อผิดพลาดในการย้ายสินค้า' })
    }
  }

  async moveToWarehouse({ request,response, auth }: HttpContextContract) {
    console.log('🟢 API DO moveToWarehouse', request.all())
    const { productId, truckId, quantity } = request.only(['productId', 'truckId','quantity'])
    if (auth.user?.role == 'truck') {
      const errorResult = {success:false, message: 'คุณไม่มีสิทธิ์ในการย้ายสินค้า' }
      console.log('🔴 API RESULT moveToWarehouse ERROR', errorResult)
      return response.status(401).json(errorResult)
    }
    try{
    let createdStocks  = []
    // TODO make it to many items
    const truckStock = await TruckStock.query()
      .where('truck_id', truckId)
      .where('product_id', productId)
      .firstOrFail()
    console.log('[moveToWarehouse] product',productId, 'truckStock of product', truckStock.quantity , 'requested quantity', quantity)
    if (truckStock.quantity < quantity) {
      const errorResult = {success:false, message: 'ไม่สามารถย้ายสินค้าได้ เนื่องจากปริมาณในรถไม่เพียงพอ' }
      console.log('🔴 API RESULT moveToWarehouse ERROR', errorResult)
      return response.status(400).json(errorResult)
    }

    // เพิ่มสินค้าลงในโกดัง
    const warehouseStock = await WarehouseStock.query()
      .where('product_id', productId)
      .first()
    if (warehouseStock) {
      console.log('warehouseStock', warehouseStock)
      warehouseStock.quantity += quantity
      await warehouseStock.save()
    } else {
      await WarehouseStock.create({
        productId:productId,
        quantity:quantity,
        updatedBy: auth.user!.id,
      })
    }

    // ลดสินค้าในรถ
    truckStock.quantity -= quantity
    if (truckStock.quantity <= 0) {
      await truckStock.delete()
    }
    else{
      await truckStock.save()
    }
    createdStocks.push({
      productId: productId,
      quantity: quantity,
      sourceId: truckStock.id,
      sourceType: 'truck',
      targetType: 'warehouse',
      type: 'move',
      userId: auth.user!.id,
    })


    await StockLog.createMany(createdStocks)

    const result = {success:true, message: 'ย้ายสินค้าไปยังโกดังสำเร็จ' }
    console.log('🔴 API RESULT moveToWarehouse', result)
    return response.status(200).json(result)
    } catch (error) {
    console.error('Error moving products to warehouse:', error)
    console.log('🔴 API RESULT moveToWarehouse ERROR', error)
    return response.status(500).json({success:false, message: 'เกิดข้อผิดพลาดในการย้ายสินค้า' })
    }
  }
}
