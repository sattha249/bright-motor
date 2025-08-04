
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('qrcode', 'SettingsController.getQrCode')
  Route.post('qrcode', 'SettingsController.uploadQrCode')
}).prefix('settings').middleware(['auth'])

