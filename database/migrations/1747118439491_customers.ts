import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class Customers extends BaseSchema {
  protected tableName = 'customers'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('customer_no').notNullable().unique()
      table.string('name').notNullable()
      table.string('email').nullable()
      table.string('tel').nullable()
      table.string('address').nullable()
      table.string('district').nullable()
      table.string('province').nullable()
      table.string('post_code').nullable()
      table.string('country').nullable()
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
