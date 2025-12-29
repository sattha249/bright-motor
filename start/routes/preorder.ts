import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/', 'PreOrdersController.index')     
  Route.get('/:id', 'PreOrdersController.show')  
  Route.post('/', 'PreOrdersController.store') 
  Route.post('/:id/confirm', 'PreOrdersController.confirm')
  Route.post('/:id/cancel', 'PreOrdersController.cancel') 
  Route.get('/sync/:truckId', 'PreOrdersController.syncForTruck')
}).prefix('/pre-orders').middleware('auth')