import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'trucks'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['user_id'])
      table.dropUnique(['user_id'])
      table.string('plate_province').nullable().after('plate_number')
      table.string('model').nullable().after('plate_province')
      table.float('load_capacity').nullable().after('model')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName,(table)=>{
      table.unique(['user_id'])
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.dropColumn('plate_province')
      table.dropColumn('model')
      table.dropColumn('load_capacity')
    })
  }
}
