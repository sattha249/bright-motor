// 📁 app/Models/SellLog.ts
import { BaseModel, column, hasMany, HasMany, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'
import SellLogItem from './SellLogItem'
import Truck from './Truck'
import Customer from './Customer'
import User from './User'
import Product from './Product'

export default class SellLog extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public billNo: string

  @column()
  public truckId: number

  @column()
  public truckName: string

  @column()
  public customerId: number

  @column()
  public totalPrice: number

  @column()
  public pendingAmount: number
  
  @column()
  public interest: number

  @column()
  public isPaid: boolean

  @column()
  public totalDiscount: number
  
  @column()
  public totalSoldPrice: number

  @column()
  public isCredit: string

  @column()
  public userId: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime
  
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasMany(() => SellLogItem)
  public items: HasMany<typeof SellLogItem>

  @belongsTo(() => Truck)
  public truck: BelongsTo<typeof Truck>

  @belongsTo(() => Customer)
  public customer: BelongsTo<typeof Customer>

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>
}
