import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'

export default class Customer extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public customerNo: string

  @column()
  public name: string

  @column()
  public email: string | null

  @column()
  public tel: string | null

  @column()
  public address: string | null

  @column()
  public district: string | null

  @column()
  public province: string | null

  @column()
  public postCode: string | null

  @column()
  public country: string | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
