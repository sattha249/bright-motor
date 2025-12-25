import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Product from 'App/Models/Product'

export default class PreOrderItem extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public preOrderId: number

  @column()
  public productId: number

  @column()
  public quantity: number

  @column()
  public price: number

  @column()
  public discount: number

  @column()
  public soldPrice: number

  @column()
  public isPaid: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>
}