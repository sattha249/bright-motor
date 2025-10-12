import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
     this.schema.table(this.tableName, (table) => {
      table.decimal('total_discount', 10, 2).defaultTo(0).notNullable()
      table.decimal('total_sold_price', 10, 2).notNullable()
    })
  }

  public async down () {
     this.schema.table(this.tableName, (table) => {
      table.dropColumn('total_discount')
      table.dropColumn('total_sold_price')
    })
  }
}
