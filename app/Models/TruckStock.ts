import { DateTime } from 'luxon'
import { BaseModel, column ,belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import Product from './Product'
import Truck from './Truck'
import User from './User'
export default class TruckStock extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public truckId: number

  @column()
  public productId: number

  @column()
  public quantity: number

  // @column()
  // public updatedBy: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

   @belongsTo(() => Product)
  public product: BelongsTo<typeof Product>

  @belongsTo(() => Truck)
  public truck: BelongsTo<typeof Truck>

  // @belongsTo(() => User, { foreignKey: 'updatedBy' })
  // public updater: BelongsTo<typeof User>
}
