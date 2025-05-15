import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'products'

   public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('category') 
      table.string('description') 
      table.string('brand').nullable() 
      table.string('model').nullable() 
      table.decimal('cost_price', 10, 2) 
      table.decimal('sell_price', 10, 2)
      table.string('unit') 
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
