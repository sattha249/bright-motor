import { test } from '@japa/runner'
import Product from 'App/Models/Product'
import Database from '@ioc:Adonis/Lucid/Database'

test.group('Product Module', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('create a new product', async ({ assert }) => {
    const product = await Product.create({
      category: 'Chain',
      description: 'W125-106L',
      brand: 'YAMAHA',
      model: 'Wave110',
      costPrice: 100,
      sellPrice: 150,
      unit: 'Bottle',
    })

    assert.exists(product.id)
    assert.equal(product.category, 'Chain')
  })

  test('list all products', async ({ assert }) => {
    await Product.create({
      category: 'Oil',
      description: '5W-40',
      costPrice: 200,
      sellPrice: 300,
      unit: 'Can',
    })

    const products = await Product.all()
    assert.isAbove(products.length, 0)
  })

  test('update a product', async ({ assert }) => {
    const product = await Product.create({
      category: 'Chain',
      description: 'W125-106L',
      costPrice: 100,
      sellPrice: 150,
      unit: 'Bottle',
    })

    product.description = 'W125-110L'
    await product.save()

    const updated = await Product.findOrFail(product.id)
    assert.equal(updated.description, 'W125-110L')
  })

  test('delete a product', async ({ assert }) => {
    const product = await Product.create({
      category: 'Oil',
      description: '5W-40',
      costPrice: 200,
      sellPrice: 300,
      unit: 'Can',
    })

    await product.delete()
    const deleted = await Product.find(product.id)
    assert.isNull(deleted)
  })
})
