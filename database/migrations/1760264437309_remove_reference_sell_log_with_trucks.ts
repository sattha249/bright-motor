import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      // Remove foreign key constraint  table.integer('truck_id').unsigned().references('id').inTable('trucks')
      table.dropForeign(['truck_id'])
      table.integer('truck_id').unsigned().nullable().alter()
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.foreign('truck_id').references('id').inTable('trucks').alter()
    })
  }
}
