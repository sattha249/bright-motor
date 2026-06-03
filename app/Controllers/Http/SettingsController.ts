import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import fs from 'fs'
import path from 'path'

export default class SettingsController {
  private qrCodePath = 'uploads/qrcode/qrcode.png' // เก็บชื่อไฟล์ไว้ตรงนี้
  private apkFolderName = 'bmt-apk' // hardcode because we will never change this ja
  private apkFileName = 'bright-motor.apk' 

  // GET /setting/qrcode
  public async getQrCode({ response }: HttpContextContract) {
    console.log('🟢 API DO getQrCode')
    const fullPath = path.join(Application.publicPath(), this.qrCodePath)

    if (!fs.existsSync(fullPath)) {
      console.log('🔴 API RESULT getQrCode ERROR', 'QR code not found')
      return response.status(404).send({ message: 'QR code not found' })
    }

    console.log('🔴 API RESULT getQrCode', 'Downloaded QR Info')
    return response.download(fullPath)
  }

  public async uploadQrCode({ request, response }: HttpContextContract) {
    console.log('🟢 API DO uploadQrCode')
    const qrFile = request.file('qrcode', {
      extnames: ['png', 'jpg', 'jpeg'],
      size: '2mb',
    })

    if (!qrFile) {
      console.log('🔴 API RESULT uploadQrCode ERROR', 'No file uploaded')
      return response.badRequest({ message: 'No file uploaded' })
    }

    if (!qrFile.isValid) {
      console.log('🔴 API RESULT uploadQrCode ERROR', qrFile.errors)
      return response.badRequest(qrFile.errors)
    }

    const targetDir = path.join(Application.publicPath(), 'uploads/qrcode')
    const targetPath = path.join(targetDir, 'qrcode.png')

    fs.mkdirSync(targetDir, { recursive: true })

    await qrFile.move(targetDir, {
      name: 'qrcode.png',
      overwrite: true,
    })

    const result = { message: 'QR code uploaded successfully' }
    console.log('🔴 API RESULT uploadQrCode', result)
    return response.ok(result)
  }

  // GET /settings/download-app
  public async downloadApp({ response }: HttpContextContract) {
    console.log('🟢 API DO downloadApp')
    const apkPath = path.join(Application.appRoot, '..', this.apkFolderName, this.apkFileName)

    if (!fs.existsSync(apkPath)) {
      console.log('🔴 API RESULT downloadApp ERROR', 'APK file not found at: ' + apkPath)
      return response.status(404).send({ message: 'Application file not found' })
    }

    console.log('🔴 API RESULT downloadApp', 'Downloaded APK Success')
    return response.attachment(apkPath, 'bright-motor.apk') // บังคับให้ดาวน์โหลดเป็นไฟล์ชื่อนี้
  }
}
