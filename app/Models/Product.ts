import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Product extends BaseModel {
  @column()

  @column({ isPrimary: true })
  public id: number

  @column()
  public productCode: string
  
  @column()
  public zone: string
  
   @column()
  public category: string

  @column()
  public description: string

  @column()
  public brand?: string

  @column()
  public model?: string

  @column()
  public costPrice: number

  @column()
  public sellPrice: number

  @column()
  public unit: string
  
  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public maxQuantity: number 
}
