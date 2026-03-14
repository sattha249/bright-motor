// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Product from 'App/Models/Product'
// note max_quantity is using for showing percent only , we not limit stock by max_quantity ja

export default class ProductsController {
  public async index({ request }: HttpContextContract) {
    console.log('🟢 API DO index', request.all())
    const { category, brand, search, page = 1, perPage = 10 } = request.qs()
    const query = Product.query()

    if (category) query.where('category', category)
    if (brand) query.where('brand', brand)
    if (search) {
      query.where((q) => {
        q.whereILike('description', `%${search}%`)
         .orWhereILike('category', `%${search}%`)
         .orWhereILike('product_code', `%${search}%`)
         .orWhereILike('brand', `%${search}%`)
         .orWhereILike('model', `%${search}%`)
      })
    }

    const result = await query.orderBy('id', 'desc').paginate(Number(page), Number(perPage))
    console.log('🔴 API RESULT index', result)
    return result
  }

  public async store({ request,response }: HttpContextContract) {
    console.log('🟢 API DO store', request.all())
    const data = request.only([
      'product_code',
      'category',
      'description',
      'brand',
      'model',
      'cost_price',
      'sell_price',
      'unit',
      'zone',
      'max_quantity'
    ])
    // check duplicate product code first
    const existingProduct = await Product.findBy('product_code', data.product_code)
    if (existingProduct) {
      const errorResult = {success:false, message: 'Product code already exists' }
      console.log('🔴 API RESULT store ERROR', errorResult)
      return response.status(401).json(errorResult)
    }
    const result = await Product.create(data)
    console.log('🔴 API RESULT store', result)
    return result
  }

  // new api for bulk insert products from csv
  public async bulkStore({ request,response }: HttpContextContract) {
    console.log('🟢 API DO bulkStore', request.all())
    const products = request.input('products', [])
    const createdProducts: Product[] = []
    const mapProductCode = products.map(el => el.product_code)
    const existingProducts = await Product.query().whereIn('product_code', mapProductCode).select('product_code')
    const duplicateProducts = existingProducts.map(el => el.productCode)
    if (duplicateProducts.length > 0) {
      const errorResult = {success:false, message: 'Some product codes already exist', duplicateProducts }
      console.log('🔴 API RESULT bulkStore ERROR', errorResult)
      return response.status(401).json(errorResult)
    }
    for (const item of products) {
        const newProduct = await Product.create({
          productCode: item.product_code,
          category: item.category,
          description: item.description,
          brand: item.brand,
          model: item.model,
          costPrice: item.cost_price,
          sellPrice: item.sell_price,
          unit: item.unit,
          zone: item.zone,
          maxQuantity: item.max_quantity || 100
        })
        createdProducts.push(newProduct)
      }
    const result = { createdProducts }
    console.log('🔴 API RESULT bulkStore', result)
    return result
  }

  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const product = await Product.findOrFail(params.id)
    console.log('🔴 API RESULT show', product)
    return product
  }

  public async update({ params, request }: HttpContextContract) {
    console.log('🟢 API DO update', { params, body: request.all() })
    const product = await Product.findOrFail(params.id)
    const data = request.only([
      'category',
      'description',
      'brand',
      'model',
      'cost_price',
      'sell_price',
      'unit',
      'zone',
      'max_quantity'
    ])

    product.merge(data)
    await product.save()
    console.log('🔴 API RESULT update', product)
    return product
  }

  public async destroy({auth,response, params }: HttpContextContract) {
    console.log('🟢 API DO destroy', params)
    const authUser =  auth.user
    if (authUser?.role !== 'admin') {
      return response.status(401).json({success:false, message: 'Only admin can delete' })
    }
    const product = await Product.findOrFail(params.id)
    await product.delete()
    return { message: 'Deleted successfully' }
  }

  public async validateCodes({ request, response }: HttpContextContract) {
    console.log('🟢 API DO validateCodes', request.all())
    const codes = request.input('codes', [])
    
    if (!codes || codes.length === 0) {
      console.log('🔴 API RESULT validateCodes', [])
      return response.ok([])
    }

    // ค้นหาสินค้าที่มีรหัสตรงกับใน list
    const products = await Product.query()
      .whereIn('product_code', codes)
      .select('id', 'product_code', 'description', 'brand', 'unit') // เลือกเฉพาะ field ที่จำเป็น

    console.log('🔴 API RESULT validateCodes', products)
    return response.ok(products)
  }
  
}