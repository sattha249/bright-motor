import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AddUuidToSellLogs extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('uuid', 36).nullable().unique()
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('uuid')
    })
  }
}
