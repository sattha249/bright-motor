import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_log_items'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.decimal('discount', 10, 2).defaultTo(0).notNullable()
      table.decimal('sold_price', 10, 2).notNullable()
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('discount')
      table.dropColumn('sold_price')
    })
  }
}
