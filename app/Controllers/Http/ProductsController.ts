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
         .orWhereILike('category', `%${search}%`)
         .orWhereILike('product_code', `%${search}%`)
         .orWhereILike('brand', `%${search}%`)
         .orWhereILike('model', `%${search}%`)
      })
    }

    return await query.orderBy('id', 'desc').paginate(Number(page), Number(perPage))
  }

  public async store({ request,response }: HttpContextContract) {
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
    // check duplicate product code first
    const existingProduct = await Product.findBy('product_code', data.product_code)
    if (existingProduct) {
      return response.status(401).json({success:false, message: 'Product code already exists' })
    }
    return await Product.create(data)
  }

  // new api for bulk insert products from csv
  public async bulkStore({ request,response }: HttpContextContract) {
    const products = request.input('products', [])
    const createdProducts: Product[] = []
    const mapProductCode = products.map(el => el.product_code)
    const existingProducts = await Product.query().whereIn('product_code', mapProductCode).select('product_code')
    const duplicateProducts = existingProducts.map(el => el.productCode)
    if (duplicateProducts.length > 0) {
      return response.status(401).json({success:false, message: 'Some product codes already exist', duplicateProducts } )
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
          zone: item.zone
        })
        createdProducts.push(newProduct)
      }
    return { createdProducts }
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