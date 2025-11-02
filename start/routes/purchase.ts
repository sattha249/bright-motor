
import Route from '@ioc:Adonis/Core/Route'


Route.group(() => {
Route.get('/', 'PurchaseOrdersController.index')
Route.post('/', 'PurchaseOrdersController.store')
Route.get('/:id', 'PurchaseOrdersController.show')
Route.put('/:id', 'PurchaseOrdersController.update')
Route.delete('/:id', 'PurchaseOrdersController.destroy')
Route.patch('/:id/approve', 'PurchaseOrdersController.approve')
})
  .prefix('/purchase-orders').middleware(['auth'])