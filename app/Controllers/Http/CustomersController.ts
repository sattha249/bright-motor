import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Customer from 'App/Models/Customer'

export default class CustomersController {
  public async index({ request }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')

    const query = Customer.query()

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
          .orWhereILike('customerNo', `%${search}%`)
      })
    }

    return await query.paginate(page, limit)
  }

  public async store({ request, response }: HttpContextContract) {
    const data = request.only([
      'customer_no', 'name', 'email', 'tel',
      'address', 'district', 'province', 'postCode', 'country'
    ])
    try {
      const customer = await Customer.create(data)
      return response.status(201).json(customer)
    } catch (error) {
      return response.status(400).json({ message: 'Unable to create customer', error: error.message })
    }
  }

  public async show({ params }: HttpContextContract) {
    return await Customer.findOrFail(params.id)
  }

  public async update({ params, request }: HttpContextContract) {
    const customer = await Customer.findOrFail(params.id)
    const data = request.only([
      'customerNo', 'name', 'email', 'tel',
      'address', 'district', 'province', 'postCode', 'country'
    ])
    customer.merge(data)
    await customer.save()
    return customer
  }

  public async destroy({ params }: HttpContextContract) {
    const customer = await Customer.findOrFail(params.id)
    await customer.delete()
    return { message: 'Deleted' }
  }
}
