import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'truck_stocks'

   public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('truck_id').unsigned().references('id').inTable('trucks').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('id').inTable('products').onDelete('CASCADE')
      table.integer('quantity')
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
