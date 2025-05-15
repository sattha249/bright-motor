
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/', 'TrucksController.index') 
  Route.post('/', 'TrucksController.store') 
  Route.get('/:id', 'TrucksController.show') 
  Route.put('/:id', 'TrucksController.update') 
  Route.delete('/:id', 'TrucksController.destroy') 
}).prefix('trucks').middleware(['auth'])