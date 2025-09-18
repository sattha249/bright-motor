import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  public async up () {
    this.schema.table(this.tableName, (table) => {
      table.string('product_code').unique().notNullable().after('id')
      table.string('zone').notNullable().defaultTo('-').after('product_code')
    })
  }

  public async down () {
    this.schema.table(this.tableName, (table) => {
      table.dropColumn('product_code')
      table.dropColumn('zone')
    })
  }
}
