import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'trucks'

   public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('plate_number')
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.timestamps(true)
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
