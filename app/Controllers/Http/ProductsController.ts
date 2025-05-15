// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Product from 'App/Models/Product'

export default class ProductsController {
  public async index({ request }: HttpContextContract) {
    const { category, brand, search, page = 1, perPage = 10 } = request.qs()
    const query = Product.query()

    if (category) query.where('category', category)
    if (brand) query.where('brand', brand)
    if (search) {
      query.where((q) => {
        q.whereILike('description', `%${search}%`)
         .orWhereILike('brand', `%${search}%`)
         .orWhereILike('model', `%${search}%`)
      })
    }

    return await query.orderBy('id', 'desc').paginate(Number(page), Number(perPage))
  }

  public async store({ request }: HttpContextContract) {
    const data = request.only([
      'category',
      'description',
      'brand',
      'model',
      'cost_price',
      'sell_price',
      'unit',
    ])

    return await Product.create(data)
  }

  public async show({ params }: HttpContextContract) {
    return await Product.findOrFail(params.id)
  }

  public async update({ params, request }: HttpContextContract) {
    const product = await Product.findOrFail(params.id)
    const data = request.only([
      'category',
      'description',
      'brand',
      'model',
      'cost_price',
      'sell_price',
      'unit',
    ])

    product.merge(data)
    await product.save()
    return product
  }

  public async destroy({auth,response, params }: HttpContextContract) {
    const authUser =  auth.user
    if (authUser?.role !== 'admin') {
      return response.status(401).json({success:false, message: 'Only admin can delete' })
    }
    const product = await Product.findOrFail(params.id)
    await product.delete()
    return { message: 'Deleted successfully' }
  }
}