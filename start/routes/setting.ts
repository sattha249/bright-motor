
import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('qrcode', 'SettingsController.getQrCode')
  Route.post('qrcode', 'SettingsController.uploadQrCode')
}).prefix('settings').middleware(['auth','requestLogger'])

// Route สำหรับดาวน์โหลด APK แบบไม่ต้องผ่าน Auth (เพื่อให้บราวเซอร์ดึงข้อมูลไปติดตั้งได้โดยตรง)
Route.get('settings/download-app', 'SettingsController.downloadApp').middleware(['requestLogger'])

