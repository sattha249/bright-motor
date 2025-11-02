// database/migrations/xxxx_purchase_orders.ts
import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'purchase_orders'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable()
      table.string('supplier_name').nullable()
      table.string('status', 50).defaultTo('Pending') // สถานะ: Pending, Approved, Cancelled
      table.text('notes').nullable()
      table.timestamp('approved_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}