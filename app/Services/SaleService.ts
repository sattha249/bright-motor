import Database from '@ioc:Adonis/Lucid/Database'
import type { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import PreOrder from 'App/Models/PreOrder'
import TruckStock from 'App/Models/TruckStock'
import WarehouseStock from 'App/Models/WarehouseStock'
import Truck from 'App/Models/Truck'
import User from 'App/Models/User'

export class SaleError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export default class SaleService {
  private async existing(uuid: string, userId: number) {
    const sale = await SellLog.query().where('uuid', uuid)
      .preload('items', (query) => query.preload('product')).preload('customer').first()
    if (sale && sale.userId !== userId) {
      throw new SaleError('Sale reference belongs to another user', 409)
    }
    return sale
  }

  public async create(input: any, actor: { id: number; role: string }, key?: string) {
    const preOrderId = input.preOrderId
    if (preOrderId !== undefined && (!Number.isSafeInteger(preOrderId) || preOrderId <= 0)) {
      throw new SaleError('Invalid preOrderId')
    }
    const uuid = preOrderId ? `preorder:${preOrderId}` : key
    if (uuid && (typeof uuid !== 'string' || uuid.length > 36 || (!preOrderId && uuid.toLowerCase().startsWith('preorder:')))) {
      throw new SaleError('Invalid sale reference')
    }
    // A retry must work even when the first request sold the last stock item.
    if (uuid && !preOrderId) {
      const sale = await this.existing(uuid, actor.id)
      if (sale) return { sale, created: false }
    }

    const clientBillNo = input.billNo
    if (clientBillNo !== undefined && !preOrderId) {
      const validUuid = typeof uuid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
      // Preserve receipts from unsynced, older APKs when the updated APK uploads them.
      if (!validUuid || typeof clientBillNo !== 'string' ||
        (clientBillNo !== `BMT-${uuid}` && !/^OFFLINE-\d{13}$/.test(clientBillNo))) {
        throw new SaleError('Invalid billNo for sale reference')
      }
    }

    try {
      return await Database.transaction(async (trx) => {
        let data = input
        let preOrder: PreOrder | null = null
        if (preOrderId) {
          preOrder = await PreOrder.query({ client: trx }).where('id', preOrderId).forUpdate().first()
          if (!preOrder) throw new SaleError('Pre-order not found', 404)
          const truck = await Truck.find(preOrder.truckId)
          if (actor.role === 'truck' && (!truck || truck.userId !== actor.id)) {
            throw new SaleError('Pre-order belongs to another truck', 403)
          }
          const previous = await this.existing(uuid!, actor.id)
          if (previous) return { sale: previous, created: false }
          if (preOrder.status !== 'Pending') {
            throw new SaleError('Pre-order is already completed or cancelled; check sales history before retrying', 409)
          }
          // Legacy APKs do not link a sale to its preorder. A sale may have committed
          // while their separate confirm request failed. Do not guess and sell it twice.
          const legacySale = await SellLog.query({ client: trx })
            .where('truck_id', preOrder.truckId).where('customer_id', preOrder.customerId)
            .where('is_preorder', true).whereNull('uuid')
            .where('created_at', '>=', preOrder.createdAt.toSQL({ includeOffset: false })!).first()
          if (legacySale) {
            throw new SaleError('พบรายการขาย preorder จากแอปรุ่นเก่าที่อาจเกี่ยวข้อง กรุณาตรวจประวัติการขายก่อนยืนยัน', 409)
          }
          await preOrder.load('items')
          data = {
            truckId: preOrder.truckId, customerId: preOrder.customerId,
            totalPrice: preOrder.totalPrice, totalDiscount: preOrder.totalDiscount,
            totalSoldPrice: preOrder.totalSoldPrice, isCredit: preOrder.isCredit,
            isPreOrder: true,
            items: preOrder.items.map((item) => ({
              productId: item.productId, quantity: item.quantity, price: item.price,
              discount: item.discount, sold_price: item.soldPrice,
              is_paid: item.isPaid === true || Number(item.isPaid) === 1,
            })),
          }
        }
        this.validateItems(data.items)
        let truckName = 'โกดัง'
        if (data.truckId) {
          const truck = await Truck.find(data.truckId)
          const user = truck?.userId ? await User.find(truck.userId) : null
          if (user) truckName = user.fullname
        }
        const pendingAmount = data.items.reduce((sum, item) => item.is_paid === false
          ? sum + Number(item.sold_price ?? item.soldPrice) * Number(item.quantity) : sum, 0)
        const billNo = preOrder ? preOrder.billNo : (clientBillNo ??
          `BMT-${data.customerId}-${data.truckId || '0'}-${Date.now()}`)

        // Insert the unique UUID before touching stock. A concurrent duplicate rolls back.
        const sale = await SellLog.create({
          uuid: uuid || null, billNo, customerId: data.customerId, truckId: data.truckId || 0,
          truckName, userId: actor.id,
          totalPrice: data.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
          totalDiscount: data.totalDiscount || 0,
          totalSoldPrice: data.totalSoldPrice || data.totalPrice,
          isCredit: data.isCredit || null, pendingAmount,
          isPaid: data.items.every((item) => item.is_paid !== false),
          interest: 0, isPreorder: data.isPreOrder || false,
        }, { client: trx })
        await this.cutStock(data, preOrder ? 'truck' : actor.role, trx)
        for (const item of data.items) {
          await SellLogItem.create({
            sellLogId: sale.id, productId: item.productId, quantity: item.quantity,
            price: item.price, totalPrice: Number(item.price) * Number(item.quantity),
            discount: item.discount || 0, soldPrice: item.sold_price ?? item.soldPrice,
            isPaid: item.is_paid !== undefined ? item.is_paid : true,
          }, { client: trx })
        }
        if (preOrder) {
          preOrder.status = 'Completed'
          await preOrder.save()
        }
        return { sale, created: true }
      })
    } catch (error) {
      // MySQL resolves simultaneous inserts against the unique UUID at commit/rollback.
      if (error.code === 'ER_DUP_ENTRY') {
        const sale = uuid ? await this.existing(uuid, actor.id) : null
        if (sale) return { sale, created: false }
        throw new SaleError('Bill number already exists; contact support before retrying', 409)
      }
      throw error
    }
  }

  private validateItems(items: any) {
    if (!Array.isArray(items) || items.length === 0) throw new SaleError('Sale items are required')
    for (const item of items) {
      if (!item || !Number.isSafeInteger(Number(item.productId)) || Number(item.productId) <= 0 ||
        !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 ||
        item.price === undefined || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 ||
        (item.sold_price ?? item.soldPrice) === undefined ||
        !Number.isFinite(Number(item.sold_price ?? item.soldPrice)) || Number(item.sold_price ?? item.soldPrice) < 0) {
        throw new SaleError('Invalid sale item')
      }
    }
  }

  private async cutStock(data: any, role: string, trx: TransactionClientContract) {
    // Consistent order reduces deadlocks when different bills share multiple products.
    const items = [...data.items].sort((a, b) => Number(a.productId) - Number(b.productId))
    for (const item of items) {
      const query = role === 'truck'
        ? TruckStock.query({ client: trx }).where('truck_id', data.truckId)
        : WarehouseStock.query({ client: trx })
      const stock = await query.where('product_id', item.productId).forUpdate().first()
      if (!stock) throw new SaleError(`Product ${item.productId} not found`)
      if (Number(stock.quantity) < Number(item.quantity)) {
        throw new SaleError(`Not enough stock of product ${item.productId}`)
      }
      stock.quantity = Number(stock.quantity) - Number(item.quantity)
      if (stock.quantity <= 0) await stock.delete()
      else await stock.save()
    }
  }
}
