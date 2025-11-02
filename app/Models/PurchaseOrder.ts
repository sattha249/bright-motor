// app/Models/PurchaseOrder.ts

import { DateTime } from 'luxon'
import { BaseModel, column, BelongsTo, belongsTo, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm'
import User from './User'
import PurchaseOrderItem from './PurchaseOrderItem'

export default class PurchaseOrder extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public userId: number // Foreign key for creator

  @column()
  public approvedBy: number | null // Foreign key for approver

  @column()
  public supplierName: string | null

  @column()
  public status: 'Pending' | 'Approved' | 'Cancelled'

  @column()
  public notes: string | null

  @column.dateTime()
  public approvedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  // --- Relationships ---

  // ผู้สร้าง (Warehouse)
  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  public creator: BelongsTo<typeof User>

  // ผู้อนุมัติ (Admin)
  @belongsTo(() => User, {
    foreignKey: 'approvedBy',
  })
  public approver: BelongsTo<typeof User>

  // รายการสินค้าใน PO นี้
  @hasMany(() => PurchaseOrderItem, {
    foreignKey: 'purchaseOrderId',
  })
  public items: HasMany<typeof PurchaseOrderItem>
}