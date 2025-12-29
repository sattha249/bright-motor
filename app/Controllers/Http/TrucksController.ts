import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Truck from 'App/Models/Truck'
import TruckStock from 'App/Models/TruckStock'

export default class TrucksController {
public async index({ request }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('perPage', 10)
    const search = request.input('search')

    const query = Truck.query().preload('user')

    if (search) {
      query.where((q) => {
        q.where('plate_number', 'like', `%${search}%`)
         .orWhere('plate_province', 'like', `%${search}%`)
         // เพิ่มค้นหารุ่นรถด้วยก็ได้ถ้าต้องการ
         .orWhere('model', 'like', `%${search}%`)
      })
    }

    return await query.paginate(page, limit)
  }
  public async store({ request }: HttpContextContract) {
    const data = request.only(['plateNumber', 'userId', 'plateProvince', 'model', 'loadCapacity'])
    let existTruck = await Truck.query().where('plateNumber', data.plateNumber).first()
    if(existTruck){
      return { success: false, message: 'มีทะเบียนรถนี้ในระบบแล้ว' }
    }
    return await Truck.create(data)
  }

  public async show({ params }: HttpContextContract) {
    return await Truck.query().where('id', params.id).preload('user').firstOrFail()
  }

  public async update({ params, request }: HttpContextContract) {
    const truck = await Truck.findOrFail(params.id)
    const data = request.only(['plateNumber', 'userId', 'plateProvince', 'model', 'loadCapacity'])
    truck.merge(data)
    await truck.save()
    return truck
  }

  public async destroy({ params }: HttpContextContract) {
    const truck = await Truck.findOrFail(params.id)
    await truck.delete()
    return { message: 'Deleted' }
  }

  public async stocks({ params, request }: HttpContextContract) {
    const { page = 1, perPage = 10, search = '' } = request.qs()

    const query = TruckStock.query()
      .where('truck_id', params.id)
      .preload('product')

    if (search) {
      query.whereHas('product', (builder) => {
        builder.whereILike('category', `%${search}%`)
          .orWhereILike('brand', `%${search}%`)
      })
    }

    return await query.paginate(page, perPage)
  }
}
