import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import fs from 'fs'
import path from 'path'

export default class SettingsController {
    private qrCodePath = 'uploads/qrcode/qrcode.png' // เก็บชื่อไฟล์ไว้ตรงนี้

  // GET /setting/qrcode
  public async getQrCode({ response }: HttpContextContract) {
    const fullPath = path.join(Application.publicPath(), this.qrCodePath)

    if (!fs.existsSync(fullPath)) {
      return response.status(404).send({ message: 'QR code not found' })
    }

    return response.download(fullPath)
  }

  public async uploadQrCode({ request, response }: HttpContextContract) {
    const qrFile = request.file('qrcode', {
      extnames: ['png', 'jpg', 'jpeg'],
      size: '2mb',
    })

    if (!qrFile) {
      return response.badRequest({ message: 'No file uploaded' })
    }

    if (!qrFile.isValid) {
      return response.badRequest(qrFile.errors)
    }

    const targetDir = path.join(Application.publicPath(), 'uploads/qrcode')
    const targetPath = path.join(targetDir, 'qrcode.png')

    fs.mkdirSync(targetDir, { recursive: true })

    await qrFile.move(targetDir, {
      name: 'qrcode.png',
      overwrite: true,
    })

    return response.ok({ message: 'QR code uploaded successfully' })
  }
}
