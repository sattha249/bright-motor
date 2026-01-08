
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
Route.get('sell-logs', 'LogsController.index')
Route.get('sell-logs/summary', 'LogsController.summary')
Route.get('sell-logs/credit','LogsController.indexCredit')
Route.get('sell-logs/credit/summary','LogsController.summaryCredit')
Route.get('sell-logs/:id', 'LogsController.show')
Route.post('sell-logs', 'LogsController.store').middleware(['auth', 'checksell'])
Route.get('sell-logs/credit/:id','LogsController.showCredit')
Route.post('sell-logs/credit/:id/pay','LogsController.closeCredit')
}).middleware(['auth','requestLogger'])


