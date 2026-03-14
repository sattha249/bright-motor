import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Customer from 'App/Models/Customer'

export default class CustomersController {
  public async index({ request }: HttpContextContract) {
    console.log('🟢 API DO index', request.all())
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

    const result = await query.paginate(page, limit)
    console.log('🔴 API RESULT index', result)
    return result
  }

  public async store({ request, response }: HttpContextContract) {
    console.log('🟢 API DO store', request.all())
    const data = request.only([
      'customer_no', 'name', 'email', 'tel',
      'address', 'district', 'province', 'postCode', 'country'
    ])
    try {
      const customer = await Customer.create(data)
      console.log('🔴 API RESULT store', customer)
      return response.status(201).json(customer)
    } catch (error) {
      console.log('🔴 API RESULT store ERROR', error)
      return response.status(400).json({ message: 'Unable to create customer', error: error.message })
    }
  }

  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const customer = await Customer.findOrFail(params.id)
    console.log('🔴 API RESULT show', customer)
    return customer
  }

  public async update({ params, request }: HttpContextContract) {
    console.log('🟢 API DO update', { params, body: request.all() })
    const customer = await Customer.findOrFail(params.id)
    const data = request.only([
      'customerNo', 'name', 'email', 'tel',
      'address', 'district', 'province', 'postCode', 'country'
    ])
    customer.merge(data)
    await customer.save()
    console.log('🔴 API RESULT update', customer)
    return customer
  }

  public async destroy({ params }: HttpContextContract) {
    console.log('🟢 API DO destroy', params)
    const customer = await Customer.findOrFail(params.id)
    await customer.delete()
    const result = { message: 'Deleted' }
    console.log('🔴 API RESULT destroy', result)
    return result
  }
}
