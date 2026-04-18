import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Truck from 'App/Models/Truck'
import TruckStock from 'App/Models/TruckStock'

export default class TrucksController {
  public async index({ request }: HttpContextContract) {
    console.log('🟢 API DO index', request.all())
    const page = request.input('page', 1)
    const limit = request.input('perPage', 100)
    const search = request.input('search')

    const query = Truck.query().preload('user')

    if (search) {
      query.where((q) => {
        q.where('plate_number', 'like', `%${search}%`)
          .orWhere('plate_province', 'like', `%${search}%`)
          .orWhere('model', 'like', `%${search}%`)
      })
    }

    const result = await query.paginate(page, limit)
    console.log('🔴 API RESULT index', result)
    return result
  }
  public async store({ request }: HttpContextContract) {
    console.log('🟢 API DO store', request.all())
    const data = request.only(['plateNumber', 'userId', 'plateProvince', 'model', 'loadCapacity'])
    let existTruck = await Truck.query().where('plateNumber', data.plateNumber).first()
    if (existTruck) {
      const errorResult = { success: false, message: 'มีทะเบียนรถนี้ในระบบแล้ว' }
      console.log('🔴 API RESULT store ERROR', errorResult)
      return errorResult
    }
    const result = await Truck.create(data)
    console.log('🔴 API RESULT store', result)
    return result
  }

  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const result = await Truck.query().where('id', params.id).preload('user').firstOrFail()
    console.log('🔴 API RESULT show', result)
    return result
  }

  public async update({ params, request }: HttpContextContract) {
    console.log('🟢 API DO update', { params, body: request.all() })
    const truck = await Truck.findOrFail(params.id)
    const data = request.only(['plateNumber', 'userId', 'plateProvince', 'model', 'loadCapacity'])
    truck.merge(data)
    await truck.save()
    console.log('🔴 API RESULT update', truck)
    return truck
  }

  public async destroy({ params }: HttpContextContract) {
    console.log('🟢 API DO destroy', params)
    const truck = await Truck.findOrFail(params.id)
    await truck.delete()
    const result = { message: 'Deleted' }
    console.log('🔴 API RESULT destroy', result)
    return result
  }

  public async stocks({ params, request }: HttpContextContract) {
    console.log('🟢 API DO stocks', { params, query: request.qs() })
    const { page = 1, perPage = 10, search = '' } = request.qs()

    const query = TruckStock.query()
      .where('truck_id', params.id)
      .preload('product')

    if (search) {
      query.whereHas('product', (builder) => {
        builder.whereILike('category', `%${search}%`)
          .orWhereILike('description', `%${search}%`)
          .orWhereILike('brand', `%${search}%`)
          .orWhereILike('product_code', `%${search}%`)
          .orWhereILike('model', `%${search}%`)
      })
    }

    const result = await query.paginate(page, perPage)
    console.log('🔴 API RESULT stocks', result)
    return result
  }
}
