
import Route from '@ioc:Adonis/Core/Route'

Route.get('sell-logs', 'LogsController.index').middleware(['auth'])
Route.get('sell-logs/summary', 'LogsController.summary').middleware(['auth'])
Route.get('sell-logs/credit','LogsController.indexCredit').middleware(['auth'])
Route.get('sell-logs/credit/summary','LogsController.summaryCredit').middleware(['auth'])
Route.get('sell-logs/:id', 'LogsController.show').middleware(['auth'])
Route.post('sell-logs', 'LogsController.store').middleware(['auth', 'checksell'])
Route.get('sell-logs/credit/:id','LogsController.showCredit').middleware(['auth'])
Route.post('sell-logs/credit/:id/pay','LogsController.closeCredit').middleware(['auth'])



