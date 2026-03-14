import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class RequestLogger {
  public async handle(
    { request, auth }: HttpContextContract,
    next: () => Promise<void>
  ) {
    console.log('--- Incoming Request ---')
    console.log('Path:', request.url())
    console.log('Method:', request.method())

    // Auth info (safe access)
    if (auth.user) {
      console.log('Auth user:', {
        id: auth.user.id,
        username: auth.user.username,
        fullname: auth.user.fullname,
        role: auth.user.role,
      })
    } else {
      console.log('Auth user: guest')
    }

    await next()
  }
}