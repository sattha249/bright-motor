import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class AddReturnColumnsAndTables extends BaseSchema {
  protected tableName = 'return_logs'

  public async up () {
    // 1. เพิ่ม column returned_quantity ใน sell_log_items
    this.schema.alterTable('sell_log_items', (table) => {
      table.integer('returned_quantity').defaultTo(0).after('quantity')
    })

    // 2. สร้างตาราง return_logs (หัวบิลคืน)
    this.schema.createTable('return_logs', (table) => {
      table.increments('id')
      table.integer('sell_log_id').unsigned().references('id').inTable('sell_logs')
      table.integer('truck_id').unsigned().references('id').inTable('trucks') // รับของคืนเข้าบิลไหน
      table.integer('user_id').unsigned().references('id').inTable('users') // ใครทำรายการ
      table.decimal('total_refund_amount', 12, 2).defaultTo(0)
      table.text('reason').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })

    // 3. สร้างตาราง return_log_items (รายการคืน)
    this.schema.createTable('return_log_items', (table) => {
      table.increments('id')
      table.integer('return_log_id').unsigned().references('id').inTable('return_logs').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('id').inTable('products')
      table.integer('quantity').notNullable()
      table.decimal('refund_price', 12, 2).notNullable() // ราคาที่คืน ณ ตอนนั้น
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable('return_log_items')
    this.schema.dropTable('return_logs')
    this.schema.alterTable('sell_log_items', (table) => {
      table.dropColumn('returned_quantity')
    })
  }
}