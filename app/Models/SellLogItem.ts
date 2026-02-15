// 📁 app/Models/SellLogItem.ts
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import SellLog from './SellLog'
import Product from './Product'

export default class SellLogItem extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public sellLogId: number

  @column()
  public productId: number

  @column()
  public quantity: number

  @column()
  public returnedQuantity: number

  @column()
  public price: number

  @column()
  public totalPrice: number

  @column()
  public discount: number
  
  @column()
  public soldPrice: number

  @column()
  public isPaid: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @belongsTo(() => SellLog)
  public sellLog: BelongsTo<typeof SellLog>

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>
}
