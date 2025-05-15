
import Route from '@ioc:Adonis/Core/Route'

// 📁 start/routes.ts
Route.group(() => {
  Route.get('/', 'WarehouseStocksController.index')
  Route.post('/import', 'WarehouseStocksController.import')
  Route.post('/move-to-truck', 'WarehouseStocksController.moveToTruck')
}).prefix('warehouse-stocks').middleware(['auth'])
