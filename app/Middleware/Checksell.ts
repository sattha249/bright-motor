import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WarehouseStock from 'App/Models/WarehouseStock'
import TruckStock from 'App/Models/TruckStock'
export default class Checksell {
  public async handle({auth,request,response}: HttpContextContract, next: () => Promise<void>) {
    const authUser =  auth.user
    const data = request.all()
    
    for (let item of data.items) {
      let selectedQueryModel
      if (authUser.role == 'truck') {
        selectedQueryModel = TruckStock.query()
          .where('truck_id', data.truckId)
      }
      else {
        selectedQueryModel = WarehouseStock.query()
      }
      const stock = await selectedQueryModel
        .where('product_id', item.productId)
        .first()
      console.log(item)
      // console.log(stock)
      if (!stock) {
        return response.status(400).json({ message: 'Product not found' })
      }
      if (stock.quantity < item.quantity) {
        return response.status(400).json({ message: 'Not enough stock', product: stock })
      }
    }

    await next()
  }
}

