
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('qrcode', 'SettingsController.getQrCode').middleware('auth')
  Route.post('qrcode', 'SettingsController.uploadQrCode').middleware('auth')
}).prefix('settings').middleware(['auth'])

