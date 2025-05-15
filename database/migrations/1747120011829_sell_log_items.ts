// 📁 database/migrations/*_sell_log_items.ts
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class SellLogItems extends BaseSchema {
  protected tableName = 'sell_log_items'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('sell_log_id').unsigned().references('id').inTable('sell_logs').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('id').inTable('products')
      table.integer('quantity').notNullable()
      table.decimal('price', 10, 2).notNullable()
      table.decimal('total_price', 10, 2).notNullable()
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
