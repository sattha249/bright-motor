import BaseSeeder from '@ioc:Adonis/Lucid/Seeder'
import Customer from 'App/Models/Customer'
import Product from 'App/Models/Product'
import Truck from 'App/Models/Truck'
import User from 'App/Models/User'
import WarehouseStock from 'App/Models/WarehouseStock'


export default class extends BaseSeeder {
  public async run() {
    await this.createUser()
    await this.createTruck()
    await this.createCustomer()
    await this.createProduct()
    await this.createWarehouseStock()
    console.log('All seeders completed')
  }
  async createCustomer() {
    await Customer.createMany([
      {
        customerNo: 'CUST001',
        name: 'คุณสมชาย ใจดี',
        email: 'somchai@example.com',
        tel: '0899999999',
        address: '123 ถ.สุขสวัสดิ์',
        district: 'บางบอน',
        province: 'กรุงเทพมหานคร',
        postCode: '10150',
        country: 'TH',
      },
    ])
    console.log('Customer seeder completed')
  }
  async createProduct() {
    await Product.createMany([
      {
        category: 'Oil',
        description: '10W-40 1L',
        brand: 'YAMAHA',
        model: 'N/A',
        costPrice: 80.00,
        sellPrice: 120.00,
        unit: 'bottle',
      },
      {
        category: 'Chain',
        description: '428H-120L',
        brand: 'HERO',
        model: 'Wave 110',
        costPrice: 150.00,
        sellPrice: 250.00,
        unit: 'piece',
      },
    ])
    console.log('Product seeder completed')
  }
  async createTruck() {
    await Truck.createMany([
      { plateNumber: '1ขข1234', userId: 3 },
    ])
    console.log('Truck seeder completed')
  }
  async createWarehouseStock() {
    await WarehouseStock.createMany([
      { productId: 1, quantity: 100, updatedBy: 2 },
      { productId: 2, quantity: 50, updatedBy: 2 },
    ])
    console.log('Warehouse stock seeder completed')
  }
  async createUser() {
    await User.createMany([
      {
        username: 'admin01',
        email: 'admin@example.com',
        password: 'password',
        fullname: 'Admin User',
        tel: '0800000000',
        role: 'admin',
      },
      {
        username: 'warehouse01',
        email: 'warehouse@example.com',
        password: 'password',
        fullname: 'Warehouse User',
        tel: '0811111111',
        role: 'warehouse',
      },
      {
        username: 'truck01',
        email: 'truck@example.com',
        password: 'password',
        fullname: 'Truck Driver 1',
        tel: '0822222222',
        role: 'truck',
      }
    ])
    console.log('User seeder completed')
  }
}
