import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'stock_logs'

   public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('product_id').unsigned().references('id').inTable('products')
      table.integer('quantity')
      table.enum('source_type', ['warehouse', 'truck'])
      table.integer('source_id')
      table.enum('target_type', ['warehouse', 'truck', 'customer', 'return'])
      table.integer('target_id')
      table.enum('type', ['import', 'export', 'move', 'sell', 'return'])
      table.integer('user_id').unsigned().references('id').inTable('users')
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
