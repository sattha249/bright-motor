import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class ReturnLog extends BaseModel {

  @column({ isPrimary: true })
  public id: number

  @column()
  public sellLogId: number

  @column()
  public truckId: number

  @column()
  public userId: number

  @column()
  public totalRefundAmount: number

  @column()
  public reason: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
