import { test } from '@japa/runner'
import Database from '@ioc:Adonis/Lucid/Database'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import Customer from 'App/Models/Customer'
import Truck from 'App/Models/Truck'
import Product from 'App/Models/Product'
import User from 'App/Models/User'

test.group('SellLog & SellLogItem', (group) => {
  let customerId: number
  let truckId: number
  let userId: number
  let product1Id: number
  let product2Id: number

  group.setup(async () => {
    await Database.beginGlobalTransaction()
  })

  group.teardown(async () => {
    await Database.rollbackGlobalTransaction()
  })

  test('setup: create customer, truck, user, products', async () => {
    const customer = await Customer.create({
      customerNo: 'CUST001_TEST',
      name: 'John Doe',
      email: 'john@example.com',
      tel: '0811111111',
      address: '123 Main St',
      district: 'Bang Kapi',
      province: 'Bangkok',
      postCode: '10310',
      country: 'Thailand',
    })

    const truck = await Truck.create({
      plateNumber: '2ขข2345',
    })

    const user = await User.create({
      username: 'seller1',
      email: 'seller@example.com',
      password: 'secret',
      fullname: 'Seller One',
      tel: '0811111112',
      role: 'truck',
    })

    const product1 = await Product.create({
      category: 'Chain',
      description: '428H-120L',
      costPrice: 200,
      sellPrice: 280,
      unit: 'piece',
    })

    const product2 = await Product.create({
      category: 'Oil',
      description: '10W-40 1L',
      costPrice: 100,
      sellPrice: 150,
      unit: 'bottle',
    })

    customerId = customer.id
    truckId = truck.id
    userId = user.id
    product1Id = product1.id
    product2Id = product2.id
  })

  test('can create sell log and items', async ({assert}) => {
    const sellLog = await SellLog.create({
      billNo: 'S-20250513-0001',
      customerId,
      truckId,
      userId,
      totalPrice: 710, // 280*2 + 150*1
    })

    await SellLogItem.create({
      sellLogId: sellLog.id,
      productId: product1Id,
      quantity: 2,
      price: 280,
      totalPrice: 560,
    })

    await SellLogItem.create({
      sellLogId: sellLog.id,
      productId: product2Id,
      quantity: 1,
      price: 150,
      totalPrice: 150,
    })

    const items = await SellLogItem.query().where('sell_log_id', sellLog.id)
    assert.lengthOf(items, 2)
    assert.equal(items[0].sellLogId, sellLog.id)
  })
})