import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class PreOrderItems extends BaseSchema {
  protected tableName = 'pre_order_items'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('pre_order_id').unsigned().references('id').inTable('pre_orders').onDelete('CASCADE')
      table.integer('product_id').unsigned().references('id').inTable('products')
      
      table.integer('quantity').notNullable()
      table.decimal('price', 12, 2).notNullable()
      table.decimal('discount', 12, 2).defaultTo(0)
      table.decimal('sold_price', 12, 2).notNullable()
      
      // is_paid ในที่นี้คือ default ที่ตั้งไว้ตอนเปิดบิล (แต่อาจเปลี่ยนตอนขายจริง)
      table.boolean('is_paid').defaultTo(true) 

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}