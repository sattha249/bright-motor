import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import WarehouseStock from 'App/Models/WarehouseStock'
import Database from '@ioc:Adonis/Lucid/Database'
import moment from 'moment'
import Product from 'App/Models/Product'
import SaleService, { SaleError } from 'App/Services/SaleService'
import User from 'App/Models/User'
const CREDIT_PERIOD = { week: 7, month: 24 } // days
const INTEREST_RATE_PERCENT = 8 // 8% per selected_period you can move it to env , but this hard code for example

export default class SellLogsController {
  public async index({ request }) {
    console.log('🟢 API DO index', request.all())
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')

    const truck = request.input('truck_id')

    let includePreOrders = request.input('include_preorder', 'all')
      // < option value = "all" > รวมทั้งสองแบบ </>
      //   < option value = "only-preorder" > เฉพาะ preorder</>
      //     < option value = "except-preorder" > ไม่รวม preorder </>
    

    const startDate = request.input('start_date') || moment().startOf('month').format('YYYY-MM-DD HH:mm:ss')
    const endDate = request.input('end_date') || moment().endOf('month').format('YYYY-MM-DD HH:mm:ss')

    const query = SellLog.query()
      .preload('items', (itemQuery) => {
        itemQuery.preload('product')
      })
      .preload('customer')
      .preload('truck')

    if (search) {
      query.where((builder) => {
        builder
          .whereHas('customer', (customerQuery) => {
            customerQuery.where('name', 'like', `%${search}%`)
          })
          .orWhere('bill_no', 'like', `%${search}%`)
      })
    }

    if (truck !== null && truck !== undefined && truck !== '') {
      query.where('truck_id', truck)
    }

    if (includePreOrders == 'except-preorder') {
      query.where('is_preorder', false)
    } else if (includePreOrders == 'only-preorder') {
      query.where('is_preorder', true)
    }

    if (startDate) {
      query.where('created_at', '>=', `${startDate} 00:00:00`)
    }

    if (endDate) {
      query.where('created_at', '<=', `${endDate} 23:59:59`)
    }

    query.orderBy('created_at', 'desc')
    const result = await query.paginate(page, limit)
    console.log('🔴 API RESULT index', result.toJSON())
    return result
  }

  public async show({ params }: HttpContextContract) {
    console.log('🟢 API DO show', params)
    const sellLog = await SellLog.query()
      .where('id', params.id)
      .preload('items', (itemQuery) => {
        itemQuery.preload('product')
      })
      .preload('customer')
      .preload('truck')
      .firstOrFail()
    console.log('🔴 API RESULT show', sellLog.toJSON())
    return sellLog
  }

  public async store({ request, response, auth }: HttpContextContract) {
    const input = request.only([
      'customerId', 'truckId', 'totalPrice', 'items', 'totalDiscount',
      'totalSoldPrice', 'isCredit', 'isPreOrder', 'preOrderId', 'billNo',
    ])
    try {
      const { sale, created } = await new SaleService().create(
        input, auth.user! as unknown as User, request.input('uuid') || request.header('x-idempotency-key')
      )
      await sale.load('items', (query) => query.preload('product'))
      await sale.load('customer')
      return response.status(created ? 201 : 200).json({
        id: sale.id, billNo: sale.billNo, bill_no: sale.billNo,
        message: created ? 'Sell log created successfully' : 'Already processed', data: sale,
      })
    } catch (error) {
      if (error instanceof SaleError) return response.status(error.status).json({ message: error.message })
      throw error
    }
  }

  public async summary({ auth, request, response }) {
    console.log('🟢 API DO summary', request.all())
    try {
      const startDate = request.input('start_date') || moment().startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const endDate = request.input('end_date') || moment().endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const truck = request.input('truck_id')
      const search = request.input('search', '')
      const includePreOrders = request.input('include_preorder','all')
      let sellogQuery = SellLog.query()
        .where('created_at', '>=', startDate)
        .where('created_at', '<=', endDate)

      if (truck !== null && truck !== undefined && truck !== '') {
        sellogQuery = sellogQuery.where('truck_id', truck)
      }
      if (includePreOrders == 'except-preorder') {
        sellogQuery.where('is_preorder', false)
      } else if (includePreOrders == 'only-preorder') {
        sellogQuery.where('is_preorder', true)
      }

      if (search) {
        sellogQuery.where((builder) => {
          builder
            .whereHas('customer', (customerQuery) => {
              customerQuery.where('name', 'like', `%${search}%`)
            })
            .orWhere('bill_no', 'like', `%${search}%`)
        })
      }

      const sellLogsResult = await sellogQuery.sum('total_price as total').sum('total_discount as discount')
      const totalSales = sellLogsResult[0].$extras.total || 0
      const totalDiscount = sellLogsResult[0].$extras.discount || 0

      const totalProductResult = await Product.query().count('* as count')
      const totalProduct = totalProductResult[0].$extras.count

      const totalProductInStockResult = await WarehouseStock.query().count('* as count')
      const totalProductInStock = totalProductInStockResult[0].$extras.count || 0
      const result = { totalSales, totalProduct, totalProductInStock, totalDiscount }
      console.log('🔴 API RESULT summary', result)
      return response.json(result)

    }
    catch (err) {
      console.log('🔴 API RESULT summary ERROR', err)
      return response.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' })
    }
  }
  // credit section
  // 1. แสดงรายการ Credit ทั้งหมด (Index) + Search
  public async indexCredit({ request, response }: HttpContextContract) {
    console.log('🟢 API DO indexCredit', request.all())
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')

    const query = SellLog.query()
      .where('is_paid', false) // ดึงเฉพาะบิลที่ยังไม่จ่าย
      .preload('customer')
      // .whereNotNull('is_credit') // (Option) ถ้าอยากกรองเฉพาะที่มีค่า credit
      .orderBy('created_at', 'desc')

    if (search) {
      if (search !== 'ไม่ระบุรถ') {
        query.where((q) => {
          q.where('bill_no', 'like', `%${search}%`)
            .orWhere('truck_name', 'like', `%${search}%`)
            .orWhereHas('customer', (cQuery) => {
              cQuery.where('name', 'like', `%${search}%`)
            })
        })
      }
      else {
        query.where('truck_id', 0) // if send "ไม่ระบุรถ", filter truck_id = 0 (mean warehouse ja)
      }
    }

    const results = await query.paginate(page, limit)
    console.log('🔴 API RESULT indexCredit', results.toJSON())
    return response.json(results)
  }

  // 2. แสดงรายละเอียด Credit และคำนวณดอกเบี้ย (ShowCredit)
  public async showCredit({ params, response }: HttpContextContract) {
    console.log('🟢 API DO showCredit', params)
    const sellLog = await SellLog.query().where('id', params.id).preload('customer').preload('items').firstOrFail()

    if (!sellLog.isPaid && sellLog.isCredit && CREDIT_PERIOD[sellLog.isCredit]) {

      const periodDays = CREDIT_PERIOD[sellLog.isCredit] // 7 หรือ 24

      const createdAt = moment(sellLog.createdAt.toJSDate())
      const now = moment()

      const diffDays = now.diff(createdAt, 'days')

      // หากจำนวนวันเกินกำหนด (อย่างน้อย 1 รอบ)
      if (diffDays >= periodDays) {
        // คำนวณจำนวนรอบ (ปัดเศษลง)
        const rounds = Math.floor(diffDays / periodDays)
        const interestAmount = (sellLog.pendingAmount * (INTEREST_RATE_PERCENT / 100)) * rounds

        sellLog.interest = interestAmount
        await sellLog.save()
      }
    }
    await sellLog.load('items')

    console.log('🔴 API RESULT showCredit', sellLog.toJSON())
    return response.json(sellLog)
  }

  // 3. ปิด Credit (CloseCredit)
  public async closeCredit({ params, response }: HttpContextContract) {
    console.log('🟢 API DO closeCredit', params)
    const trx = await Database.transaction()

    try {
      const sellLog = await SellLog.findOrFail(params.id)
      sellLog.isPaid = true
      sellLog.useTransaction(trx)
      await sellLog.save()

      // 2. อัปเดต SellLogItems (Items) ที่เป็นลูกของบิลนี้ทั้งหมด
      await SellLogItem.query({ client: trx })
        .where('sell_log_id', sellLog.id)
        .update({ is_paid: true })

      await trx.commit()

      const result = { message: 'Credit closed successfully', data: sellLog }
      console.log('🔴 API RESULT closeCredit', { ...result, data: sellLog.serialize() })
      return response.json(result)
    } catch (error) {
      await trx.rollback()
      console.log('🔴 API RESULT closeCredit ERROR', error)
      return response.status(500).json({ message: 'Failed to close credit', error: error.message })
    }
  }

  public async summaryCredit({ request, response }: HttpContextContract) {
    console.log('🟢 API DO summaryCredit', request.all())
    console.log('Generating credit summary report...')

    // 1. Get the 'groupBy' parameter from the request query string
    const groupBy = request.input('groupBy', 'truck') // default to 'truck'

    // 2. Start the query builder
    const query = Database.from('sell_logs')

    // 3. Conditional Selection and Grouping
    if (groupBy === 'customer') {
      // Join with customers table to get names
      query
        .leftJoin('customers', 'sell_logs.customer_id', 'customers.id')
        .select('customers.name as group_name') // Alias as group_name for consistent frontend mapping
        .groupBy('customers.name')
        .orderBy('customers.name', 'asc')
    } else {
      // Default: Group by Truck Name
      query
        .select('truck_name as group_name') // Alias as group_name
        .whereNotNull('truck_name')
        .groupBy('truck_name')
        .orderBy('truck_name', 'asc')
    }

    // 4. Select Aggregates (Common logic)
    const summaries = await query
      // --- Unpaid Group (is_paid = 0) ---
      .select(Database.raw('SUM(CASE WHEN is_paid = 0 THEN pending_amount ELSE 0 END) as total_unpaid_amount'))
      .select(Database.raw('COUNT(CASE WHEN is_paid = 0 THEN 1 END) as count_unpaid_bills'))
      .select(Database.raw('SUM(CASE WHEN is_paid = 0 THEN interest ELSE 0 END) as total_unpaid_interest'))

      // --- Paid Group (is_paid = 1) ---
      .select(Database.raw('SUM(CASE WHEN is_paid = 1 THEN pending_amount ELSE 0 END) as total_paid_amount'))
      .select(Database.raw('COUNT(CASE WHEN is_paid = 1 THEN 1 END) as count_paid_bills'))
      .select(Database.raw('SUM(CASE WHEN is_paid = 1 THEN interest ELSE 0 END) as total_paid_interest'))

    // 5. Format Data
    const formattedData = summaries.map((item) => ({
      group_name: item.group_name || (groupBy === 'customer' ? 'ไม่ระบุลูกค้า' : 'ไม่ระบุรถ'), // Handle nulls

      total_unpaid_amount: Number(item.total_unpaid_amount || 0),
      count_unpaid_bills: Number(item.count_unpaid_bills || 0),
      total_unpaid_interest: Number(item.total_unpaid_interest || 0),

      total_paid_amount: Number(item.total_paid_amount || 0),
      count_paid_bills: Number(item.count_paid_bills || 0),
      total_paid_interest: Number(item.total_paid_interest || 0),
    }))

    console.log('🔴 API RESULT summaryCredit', formattedData)
    return response.json(formattedData)
  }
}
