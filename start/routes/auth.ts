
import Route from '@ioc:Adonis/Core/Route'

Route.post('register', 'AuthController.register').middleware('auth')
Route.post('login', 'AuthController.login')
Route.post('logout', 'AuthController.logout').middleware('auth')