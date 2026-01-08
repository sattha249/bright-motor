
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/:id/stocks','TrucksController.stocks')
  Route.get('/', 'TrucksController.index') 
  Route.post('/', 'TrucksController.store') 
  Route.get('/:id', 'TrucksController.show') 
  Route.put('/:id', 'TrucksController.update') 
  Route.delete('/:id', 'TrucksController.destroy') 
// POST /truck/return-to-warehouse → คืนสินค้าเก่ากลับคลัง
// POST /truck/replace-product → เปลี่ยนสินค้า (สินค้า A → B)
}).prefix('trucks').middleware(['auth','requestLogger'])