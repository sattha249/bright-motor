import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Truck from 'App/Models/Truck'

export default class TrucksController {
  public async index({}: HttpContextContract) {
    return await Truck.query().preload('user')
  }

  public async store({ request }: HttpContextContract) {
    const data = request.only(['plateNumber', 'userId'])
    return await Truck.create(data)
  }

  public async show({ params }: HttpContextContract) {
    return await Truck.query().where('id', params.id).preload('user').firstOrFail()
  }

  public async update({ params, request }: HttpContextContract) {
    const truck = await Truck.findOrFail(params.id)
    const data = request.only(['plateNumber', 'userId'])
    truck.merge(data)
    await truck.save()
    return truck
  }

  public async destroy({ params }: HttpContextContract) {
    const truck = await Truck.findOrFail(params.id)
    await truck.delete()
    return { message: 'Deleted' }
  }
}
