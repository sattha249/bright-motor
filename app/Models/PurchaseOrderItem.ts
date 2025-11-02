// app/Models/PurchaseOrderItem.ts

import { DateTime } from 'luxon'
import { BaseModel, column, BelongsTo, belongsTo } from '@ioc:Adonis/Lucid/Orm'
import PurchaseOrder from './PurchaseOrder'
import Product from './Product' // สมมติว่าคุณมี Model 'Product'

export default class PurchaseOrderItem extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public purchaseOrderId: number

  @column()
  public productId: number

  @column()
  public quantity: number

  @column()
  public costPrice: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  // --- Relationships ---

  @belongsTo(() => PurchaseOrder, {
    foreignKey: 'purchaseOrderId',
  })
  public purchaseOrder: BelongsTo<typeof PurchaseOrder>

  @belongsTo(() => Product, {
    foreignKey: 'productId',
  })
  public product: BelongsTo<typeof Product>
}