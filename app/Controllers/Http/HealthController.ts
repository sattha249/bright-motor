import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'

export default class HealthController {
  public async index({ response }: HttpContextContract) {
    try {
      // Fast check database connection
      await Database.rawQuery('SELECT 1')
      return response.ok({
        status: 'ok',
        online: true,
        db: 'connected',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      return response.status(503).json({
        status: 'error',
        online: false,
        db: 'disconnected',
        message: error.message || 'Database query failed',
        timestamp: new Date().toISOString(),
      })
    }
  }
}
