import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AlterSellLogs extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string(('truck_name')).nullable().after('truck_id')
      table.decimal('pending_amount', 10, 2).defaultTo(0).after('total_price')
      table.decimal('interest', 10, 2).defaultTo(0).after('pending_amount')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('truck_name')
      table.dropColumn('pending_amount')
      table.dropColumn('interest')
    })
  }
}