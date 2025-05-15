
import { test } from '@japa/runner'
import WarehouseStock from 'App/Models/WarehouseStock'
import Product from 'App/Models/Product'
import User from 'App/Models/User'
import Database from '@ioc:Adonis/Lucid/Database'

test.group('Warehouse Stock Module', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.each.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('create a warehouse stock entry', async ({ assert }) => {
    const user = await User.create({
      username: 'admin1',
      email: 'admin1@example.com',
      password: 'password',
      fullname: 'Admin One',
      tel: '0100000001',
      role: 'admin',
    })

    const product = await Product.create({
      category: 'Oil',
      description: '5W-40',
      costPrice: 200,
      sellPrice: 300,
      unit: 'Can',
    })

    const stock = await WarehouseStock.create({
      productId: product.id,
      quantity: 10,
      updatedBy: user.id,
    })

    assert.exists(stock.id)
    assert.equal(stock.productId, product.id)
    assert.equal(stock.updatedBy, user.id)
  })

  test('update a warehouse stock quantity', async ({ assert }) => {
    const user = await User.create({
      username: 'editor1',
      email: 'editor1@example.com',
      password: 'password',
      fullname: 'Editor One',
      tel: '0100000002',
      role: 'warehouse',
    })

    const product = await Product.create({
      category: 'Chain',
      description: 'W125-106L',
      costPrice: 100,
      sellPrice: 150,
      unit: 'Piece',
    })

    const stock = await WarehouseStock.create({
      productId: product.id,
      quantity: 5,
      updatedBy: user.id,
    })

    stock.quantity = 8
    await stock.save()

    const updated = await WarehouseStock.findOrFail(stock.id)
    assert.equal(updated.quantity, 8)
  })
})
