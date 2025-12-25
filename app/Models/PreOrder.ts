import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import PreOrderItem from 'App/Models/PreOrderItem'
import Truck from 'App/Models/Truck'
import Customer from 'App/Models/Customer'
import User from 'App/Models/User'

export default class PreOrder extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public billNo: string

  @column()
  public truckId: number

  @column()
  public customerId: number

  @column()
  public userId: number

  @column()
  public status: 'Pending' | 'Synced' | 'Completed' | 'Cancelled'

  @column()
  public totalPrice: number

  @column()
  public totalDiscount: number

  @column()
  public totalSoldPrice: number

  @column()
  public isCredit: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  // Relationships
  @hasMany(() => PreOrderItem)
  public items: HasMany<typeof PreOrderItem>

  @belongsTo(() => Truck)
  public truck: BelongsTo<typeof Truck>

  @belongsTo(() => Customer)
  public customer: BelongsTo<typeof Customer>

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>
}