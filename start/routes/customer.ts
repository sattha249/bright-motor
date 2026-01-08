
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/', 'CustomersController.index')
  Route.post('/', 'CustomersController.store')
  Route.get('/:id', 'CustomersController.show')
  Route.put('/:id', 'CustomersController.update')
  Route.delete('/:id', 'CustomersController.destroy')
}).prefix('/customers').middleware(['auth','requestLogger'])
