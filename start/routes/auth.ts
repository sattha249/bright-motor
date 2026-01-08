
import Route from '@ioc:Adonis/Core/Route'
Route.post('login', 'AuthController.login')

Route.group(() => {
Route.post('register', 'AuthController.register')
Route.post('logout', 'AuthController.logout')
Route.get('profile', 'AuthController.getProfile')
Route.put('profile', 'AuthController.updateProfile')
Route.get('users', 'AuthController.listUsers')
Route.put('users/:id', 'AuthController.updateUser')
Route.delete('users/:id', 'AuthController.deleteUser')
}).middleware(['auth','requestLogger'])