
import Route from '@ioc:Adonis/Core/Route'

Route.get('sell-logs', 'LogsController.index').middleware(['auth'])
Route.get('sell-logs/:id', 'LogsController.show').middleware(['auth'])
Route.post('sell-logs', 'LogsController.store').middleware(['auth', 'checksell'])