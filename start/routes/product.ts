
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/', 'ProductsController.index')
  Route.post('/validate-codes', 'ProductsController.validateCodes')
  Route.post('/', 'ProductsController.store')
  Route.post('/bulk-store', 'ProductsController.bulkStore')
  Route.get('/:id', 'ProductsController.show')
  Route.put('/:id', 'ProductsController.update')
  Route.delete('/:id', 'ProductsController.destroy')
})
  .prefix('products').middleware(['auth','requestLogger'])