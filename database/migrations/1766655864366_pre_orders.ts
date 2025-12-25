import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class PreOrders extends BaseSchema {
  protected tableName = 'pre_orders'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('bill_no').notNullable().unique() // เลขที่เอกสาร (เช่น PO-xxxx)
      table.integer('truck_id').unsigned().references('id').inTable('trucks').onDelete('CASCADE') // รถคันไหนรับของไป
      table.integer('customer_id').unsigned().references('id').inTable('customers').onDelete('SET NULL') // ลูกค้าปลายทาง
      table.integer('user_id').unsigned().references('id').inTable('users') // คนเปิดบิล
      
      // สถานะ: 
      // 'Pending' = เปิดบิลแล้ว ของขึ้นรถแล้ว รอ Sync
      // 'Synced' = รถดูดข้อมูลไปแล้ว
      // 'Completed' = ขายจริงแล้ว (ปิดจ็อบ)
      // 'Cancelled' = ยกเลิก (ดึงของกลับ)
      table.enum('status', ['Pending', 'Synced', 'Completed', 'Cancelled']).defaultTo('Pending')
      
      table.decimal('total_price', 12, 2).defaultTo(0)
      table.decimal('total_discount', 12, 2).defaultTo(0)
      table.decimal('total_sold_price', 12, 2).defaultTo(0)
      
      table.string('is_credit', 10).nullable() // week, month, null
      
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}