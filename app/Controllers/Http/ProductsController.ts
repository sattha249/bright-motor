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
         .orWhereILike('product_code', `%${search}%`)
         .orWhereILike('brand', `%${search}%`)
         .orWhereILike('model', `%${search}%`)
      })
    }

    return await query.orderBy('id', 'desc').paginate(Number(page), Number(perPage))
  }

  public async store({ request }: HttpContextContract) {
    const data = request.only([
      'product_code',
      'category',
      'description',
      'brand',
      'model',
      'cost_price',
      'sell_price',
      'unit',
      'zone'
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
      'zone'
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

  public async validateCodes({ request, response }: HttpContextContract) {
    const codes = request.input('codes', [])
    
    if (!codes || codes.length === 0) {
      return response.ok([])
    }

    // ค้นหาสินค้าที่มีรหัสตรงกับใน list
    const products = await Product.query()
      .whereIn('product_code', codes)
      .select('id', 'product_code', 'description', 'brand', 'unit') // เลือกเฉพาะ field ที่จำเป็น

    return response.ok(products)
  }
  
}