// app/Controllers/Http/AuthController.ts
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Hash from '@ioc:Adonis/Core/Hash'
import Truck from 'App/Models/Truck'

export default class AuthController {
  public async register({ auth,request,response }: HttpContextContract) {
    console.log('🟢 API DO register', request.all())
    const authUser =  auth.user
    const data = request.only(['username', 'email', 'password', 'role','fullname','tel'])
    if (authUser?.role !== 'admin') {
      return response.status(401).json({sucees:false, message: 'Only admin can register' })
    }
    const user = await User.create(data)
    console.log('🔴 API RESULT register', user)
    return user
  }

  public async login({ request, auth, response }: HttpContextContract) {
    console.log('🟢 API DO login', request.all())
    const { username, password } = request.only(['username', 'password'])

    const user = await User.query().where('username', username).firstOrFail()
    const isPasswordValid = await Hash.verify(user.password, password)
    if (!isPasswordValid) {
      console.log('🔴 API RESULT login ERROR', 'Invalid credentials')
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    const token = await auth.use('api').generate(user)
    console.log('🔴 API RESULT login', token)
    return response.status(200).json(token)  
  }

  public async logout({ auth }: HttpContextContract) {
    console.log('🟢 API DO logout')
    await auth.use('api').revoke()
    const result = { message: 'Logged out successfully' }
    console.log('🔴 API RESULT logout', result)
    return result
  }

    public async getProfile({ auth, response }: HttpContextContract) {
    console.log('🟢 API DO getProfile')
    const user = auth.user!
    const truck = await Truck.query().where('userId', user.id).first()
    const userWithTruck = {
      ...user.serialize(),
      truck_id: truck ? truck.id : null,
    }
    console.log('🔴 API RESULT getProfile', userWithTruck)
    return response.ok(userWithTruck)
  }

    public async updateProfile({ auth, request, response }: HttpContextContract) {
    console.log('🟢 API DO updateProfile', request.all())
    const user = auth.user!

    const payload = request.only(['fullname', 'email', 'tel', 'username'])

    
    if (payload.email && payload.email !== user.email) {
      const exists = await User.query().where('email', payload.email).first()
      if (exists) {
        console.log('🔴 API RESULT updateProfile ERROR', 'Email already taken')
        return response.badRequest({ message: 'Email already taken' })
      }
    }

    if (payload.username && payload.username !== user.username) {
      const exists = await User.query().where('username', payload.username).first()
      if (exists) {
        console.log('🔴 API RESULT updateProfile ERROR', 'Username already taken')
        return response.badRequest({ message: 'Username already taken' })
      }
    }

    user.merge(payload)
    await user.save()

    console.log('🔴 API RESULT updateProfile', user)
    return response.ok(user)
  }
  // implement by these 
//   Route.get('users', 'AuthController.listUsers').middleware('auth')
// Route.put('users/:id', 'AuthController.updateUser').middleware('auth')
// Route.delete('users/:id', 'AuthController.deleteUser').middleware('auth')
  public async listUsers({ auth,request, response }: HttpContextContract) {
    console.log('🟢 API DO listUsers', request.all())
    // make it query by qs too
    const { role, search, page = 1, perPage = 10 } = request.qs()

    const authUser =  auth.user
    if (authUser?.role !== 'admin') {
      return response.status(401).json({success:false, message: 'Only admin can list users' })
    }
    let users =  User.query().select('id', 'username', 'email', 'role', 'fullname', 'tel', 'createdAt', 'updatedAt')
    if (role) users = users.where('role', role)
    if (search) {
      users = users.where((q) => {
        q.whereILike('fullname', `%${search}%`)
         .orWhereILike('email', `%${search}%`)
         .orWhereILike('username', `%${search}%`)
         .orWhereILike('tel', `%${search}%`)
      })
    }
    users = await users.orderBy('id', 'desc').paginate(Number(page), Number(perPage))
    console.log('🔴 API RESULT listUsers', users)
    return response.ok(users)
  }

  public async updateUser({ auth, request, response, params }: HttpContextContract) {
    console.log('🟢 API DO updateUser', { params, body: request.all() })
    const authUser =  auth.user
    if (authUser?.role !== 'admin') {
      return response.status(401).json({success:false, message: 'Only admin can update users' })
    }
    const user = await User.findOrFail(params.id)
    const payload = request.only(['fullname', 'email', 'tel', 'username', 'role'])
    
    if (payload.email && payload.email !== user.email) {
      const exists = await User.query().where('email', payload.email).first()
      if (exists) {
        console.log('🔴 API RESULT updateUser ERROR', 'Email already taken')
        return response.badRequest({ message: 'Email already taken' })
      }
    }
   
    if (payload.username && payload.username !== user.username) {
      const exists = await User.query().where('username', payload.username).first()
      if (exists) {
        console.log('🔴 API RESULT updateUser ERROR', 'Username already taken')
        return response.badRequest({ message: 'Username already taken' })
      }
    }
    user.merge(payload)
    await user.save()
    console.log('🔴 API RESULT updateUser', user)
    return response.ok(user)
  }
  public async deleteUser({ auth, response, params }: HttpContextContract) {
    console.log('🟢 API DO deleteUser', params)
    const authUser =  auth.user
    if (authUser?.role !== 'admin') {
      return response.status(401).json({success:false, message: 'Only admin can delete users' })
    }
    const user = await User.findOrFail(params.id)
    await user.delete()
    const result = { message: 'User deleted successfully' }
    console.log('🔴 API RESULT deleteUser', result)
    return response.ok(result)
  }
}