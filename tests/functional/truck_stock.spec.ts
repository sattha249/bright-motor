import { test } from '@japa/runner'
import Database from '@ioc:Adonis/Lucid/Database'
import Product from 'App/Models/Product'
import Truck from 'App/Models/Truck'
import TruckStock from 'App/Models/TruckStock'

test.group('TruckStock', (group) => {
  let productId: number
  let truckId: number

  group.setup(async () => {
    await Database.beginGlobalTransaction()

    const product = await Product.create({
      category: 'Oil',
      description: '10W-40 1L',
      costPrice: 100,
      sellPrice: 150,
      unit: 'bottle',
    })

    const truck = await Truck.create({
      plateNumber: '1ขข1234',
    })

    productId = product.id
    truckId = truck.id
  })

  group.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('can create truck stock entry', async ({ assert }) => {
    const stock = await TruckStock.create({
      truckId,
      productId,
      quantity: 10,
    })

    assert.exists(stock.id)
    assert.equal(stock.quantity, 10)
  })

  test('can update truck stock quantity', async ({ assert }) => {
    // สร้าง stock เริ่มต้นก่อน
    const stock = await TruckStock.create({
      truckId,
      productId,
      quantity: 10,
    })

    // อัปเดตจำนวนสินค้าในสต็อก
    stock.quantity += 5
    await stock.save()

    const updated = await TruckStock.findOrFail(stock.id)
    assert.equal(updated.quantity, 15)
  })
})
