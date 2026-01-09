
import Route from '@ioc:Adonis/Core/Route'

// 📁 start/routes.ts
Route.group(() => {
  Route.get('/', 'WarehouseStocksController.index')
  Route.get('/:productId', 'WarehouseStocksController.show')
  Route.post('/import', 'WarehouseStocksController.import')
  Route.post('/move-to-truck', 'WarehouseStocksController.moveToTruck')
  Route.post('move-to-warehouse', 'WarehouseStocksController.moveToWarehouse')
}).prefix('warehouse-stocks').middleware(['auth','requestLogger'])
