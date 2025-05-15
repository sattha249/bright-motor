import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Product from './Product'
import User from './User'
export default class StockLog extends BaseModel {
  @column({ isPrimary: true })
  public id: number
  
  @column()
  public productId: number

  @column()
  public quantity: number

  @column()
  public sourceType: 'warehouse' | 'truck'

  @column()
  public sourceId: number

  @column()
  public targetType: 'warehouse' | 'truck' | 'customer' | 'return'

  @column()
  public targetId: number

  @column()
  public type: 'import' | 'export' | 'move' | 'sell' | 'return'

  @column()
  public userId: number
  
  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
//
  @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @belongsTo(() => User, { foreignKey: 'userId' })
  public user: BelongsTo<typeof User>
  //
}
