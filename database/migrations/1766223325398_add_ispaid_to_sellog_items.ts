import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_log_items'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_paid').defaultTo(false).after('sold_price')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_paid')
    })
  }
}
