import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import TruckStock from 'App/Models/TruckStock'
import WarehouseStock from 'App/Models/WarehouseStock'
import Database from '@ioc:Adonis/Lucid/Database'
import moment from 'moment'
import Product from 'App/Models/Product'

export default class SellLogsController {
  public async index({ request }) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')
    const truck = request.input('truck', '')
    const query = SellLog.query()
      .preload('items')
      .preload('customer')
      .preload('truck')

    if (search) {
      query.where((builder) => {
        builder
          .whereHas('customer', (customerQuery) => {
            customerQuery.where('name', 'like', `%${search}%`)
          })
          .orWhere('bill_no', 'like', `%${search}%`)
      })
    }

    if (truck) {
      query.where('truck_id', truck)
    }
    query.orderBy('created_at', 'desc')
    return await query.paginate(page, limit)
  }

  public async show({ params }: HttpContextContract) {
    const sellLog = await SellLog.query()
      .where('id', params.id)
      .preload('items')
      .preload('customer')
      .preload('truck')
      .firstOrFail()
    return sellLog
  }

  public async store({ request,response, auth }: HttpContextContract) {
    const data = request.only([ 'customerId', 'truckId', 'totalPrice', 'items','totalDiscount','totalSoldPrice','isCredit'])

    const trx = await Database.transaction()
    try {
      await this.cutStock(data,auth.user?.role)
      const billNo = this.generateBillNo(data)
      const sellLog = await SellLog.create({
        billNo: billNo,
        customerId: data.customerId,
        truckId: data.truckId || 0, // 0 means from warehouse
        totalPrice: data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
        totalDiscount: data.totalDiscount || 0,
        totalSoldPrice: data.totalSoldPrice || data.totalPrice,
        isCredit: data.isCredit || null,
        userId: auth.user?.id,
      }, { client: trx })

      for (const item of data.items) {
        await SellLogItem.create({
          sellLogId: sellLog.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity,
          discount: item.discount || 0,
          soldPrice: item.soldPrice || item.price,
        }, { client: trx })
      }
      await trx.commit()
      
      return response.status(201).json({billNo: billNo, message: 'Sell log created successfully', data: sellLog})
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  private generateBillNo(data){
    return `BMT-${data.customerId}-${data.truckId || '0'}-${new Date().getTime()}`
  }

  private async cutStock(data,role) {
    const trx = await Database.transaction()
    try {
      for (const item of data.items) {
        let selectedQueryModel = role == 'truck' ? TruckStock.query().where('truck_id', data.truckId) : WarehouseStock.query()
        const stock = await selectedQueryModel
          .where('product_id', item.productId)
          .first()

        if (stock) {
          stock.quantity -= item.quantity
          await stock.save({ client: trx })
        }
      }
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  public async summary({auth,request,response}){
    try{
    const startDate = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss')
    const endDate = moment().endOf('month').format('YYYY-MM-DD HH:mm:ss')
    const sellLogsResult = await SellLog.query()
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .sum('total_price as total')
      .sum('total_discount as discount')
    const totalSales = sellLogsResult[0].$extras.total || 0
    const totalDiscount = sellLogsResult[0].$extras.discount || 0

    const totalProductResult = await Product.query().count('* as count')
    const totalProduct = totalProductResult[0].$extras.count

    const totalProductInStockResult = await WarehouseStock.query().count('* as count')
    const totalProductInStock = totalProductInStockResult[0].$extras.count || 0
    return response.json({totalSales,totalProduct,totalProductInStock,totalDiscount})
     
  }
  catch(err){
    console.log(err)
    return response.status(500).json({success:false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'})
  }
}
}
