import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      // alter table
      table.enum('is_credit',[null,'week','month']).defaultTo(null).after('total_price')
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      // reverse alternations
      table.dropColumn('is_credit')
    })
  }
}
