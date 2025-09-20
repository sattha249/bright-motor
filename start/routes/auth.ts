
import Route from '@ioc:Adonis/Core/Route'

Route.post('register', 'AuthController.register').middleware('auth')
Route.post('login', 'AuthController.login')
Route.post('logout', 'AuthController.logout').middleware('auth')

Route.get('profile', 'AuthController.getProfile').middleware('auth')
Route.put('profile', 'AuthController.updateProfile').middleware('auth')

Route.get('users', 'AuthController.listUsers').middleware('auth')
Route.put('users/:id', 'AuthController.updateUser').middleware('auth')
Route.delete('users/:id', 'AuthController.deleteUser').middleware('auth')