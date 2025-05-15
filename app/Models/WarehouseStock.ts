import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Product from './Product'
import User from './User'
export default class WarehouseStock extends BaseModel {
  
  @column({ isPrimary: true })
  public id: number
  
  @column()
  public productId: number

  @column()
  public quantity: number

  @column()
  public updatedBy: number

  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  public updater: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
