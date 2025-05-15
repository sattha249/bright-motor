// 📁 database/migrations/*_sell_logs.ts
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class SellLogs extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('bill_no').notNullable().unique()
      table.integer('truck_id').unsigned().references('id').inTable('trucks')
      table.integer('customer_id').unsigned().references('id').inTable('customers')
      table.decimal('total_price', 10, 2).notNullable()
      table.integer('user_id').unsigned().references('id').inTable('users') 
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
