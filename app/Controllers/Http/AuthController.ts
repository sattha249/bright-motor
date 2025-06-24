// app/Controllers/Http/AuthController.ts
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Hash from '@ioc:Adonis/Core/Hash'
import Truck from 'App/Models/Truck'

export default class AuthController {
  public async register({ auth,request,response }: HttpContextContract) {
    const authUser =  auth.user
    const data = request.only(['username', 'email', 'password', 'role','fullname','tel'])
    if (authUser?.role !== 'admin') {
      return response.status(401).json({sucees:false, message: 'Only admin can register' })
    }
    const user = await User.create(data)
    return user
  }

  public async login({ request, auth, response }: HttpContextContract) {
    const { username, password } = request.only(['username', 'password'])

    const user = await User.query().where('username', username).firstOrFail()
    const isPasswordValid = await Hash.verify(user.password, password)
    if (!isPasswordValid) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    const token = await auth.use('api').generate(user)
    return response.status(200).json(token)  
  }

  public async logout({ auth }: HttpContextContract) {
    await auth.use('api').revoke()
    return { message: 'Logged out successfully' }
  }

    public async getProfile({ auth, response }: HttpContextContract) {
    const user = auth.user!
    const truck = await Truck.query().where('userId', user.id).first()
    const userWithTruck = {
      ...user.serialize(),
      truck_id: truck ? truck.id : null,
    }
    return response.ok(userWithTruck)
  }

    public async updateProfile({ auth, request, response }: HttpContextContract) {
    const user = auth.user!

    const payload = request.only(['fullname', 'email', 'tel', 'username'])

    
    if (payload.email && payload.email !== user.email) {
      const exists = await User.query().where('email', payload.email).first()
      if (exists) return response.badRequest({ message: 'Email already taken' })
    }

    if (payload.username && payload.username !== user.username) {
      const exists = await User.query().where('username', payload.username).first()
      if (exists) return response.badRequest({ message: 'Username already taken' })
    }

    user.merge(payload)
    await user.save()

    return response.ok(user)
  }
}