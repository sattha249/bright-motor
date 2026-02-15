import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'sell_logs'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.boolean('is_preorder').defaultTo(false)
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('is_preorder')
    })
  }
}
