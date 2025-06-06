import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import TruckStock from 'App/Models/TruckStock'
import WarehouseStock from 'App/Models/WarehouseStock'
import Database from '@ioc:Adonis/Lucid/Database'

export default class SellLogsController {
  public async index({ request }) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')

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
    const data = request.only([ 'customerId', 'truckId', 'totalPrice', 'items'])

    const trx = await Database.transaction()
    try {
      const billNo = this.generateBillNo(data)
      const sellLog = await SellLog.create({
        billNo: billNo,
        customerId: data.customerId,
        truckId: data.truckId,
        totalPrice: data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
        userId: auth.user?.id,
      }, { client: trx })

      for (const item of data.items) {
        await SellLogItem.create({
          sellLogId: sellLog.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity,
        }, { client: trx })
      }
      await trx.commit()
      await this.cutStock(data,auth.user?.role)
      return response.status(201).json({billNo: billNo, message: 'Sell log created successfully', data: sellLog})
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  private generateBillNo(data){
    return `BMT-${data.customerId}-${data.truckId}-${new Date().getTime()}`
  }

  private async cutStock(data,role) {
    const trx = await Database.transaction()
    try {
      for (const item of data.items) {
        let selectedQueryModel = role == 'truck' ? TruckStock.query().where('truck_id', data.truckId) : WarehouseStock.query()
        const stock = await selectedQueryModel
          .where('truck_id', data.truckId)
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
}
