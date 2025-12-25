import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import SellLog from 'App/Models/SellLog'
import SellLogItem from 'App/Models/SellLogItem'
import TruckStock from 'App/Models/TruckStock'
import WarehouseStock from 'App/Models/WarehouseStock'
import Database from '@ioc:Adonis/Lucid/Database'
import moment from 'moment'
import Product from 'App/Models/Product'
import Truck from 'App/Models/Truck'
import User from 'App/Models/User'
const CREDIT_PERIOD = { week: 7 , month: 24} // days
const INTEREST_RATE_PERCENT = 3 // 3% per selected_period

export default class SellLogsController {
 public async index({ request }) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')
    
    const truck = request.input('truck_id') 
    const startDate = request.input('start_date')
    const endDate = request.input('end_date')

    const query = SellLog.query()
      .preload('items')
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

    if (startDate) {
      query.where('created_at', '>=', `${startDate} 00:00:00`)
    }

    if (endDate) {
      query.where('created_at', '<=', `${endDate} 23:59:59`)
    }

    query.orderBy('created_at', 'desc')
    return await query.paginate(page, limit)
  }

  public async show({ params }: HttpContextContract) {
    const sellLog = await SellLog.query()
      .where('id', params.id)
      .preload('items')
      .preload('customer')
      .preload('truck')
      .firstOrFail()
    return sellLog
  }

public async store({ request, response, auth }: HttpContextContract) {
    const data = request.only([
      'customerId', 'truckId', 'totalPrice', 'items',
      'totalDiscount', 'totalSoldPrice', 'isCredit'
    ])

    let truckName = 'โกดัง' // default
    if (data.truckId) {
      const truck = await Truck.find(data.truckId)
      if (truck && truck.userId) {
        const user = await User.find(truck.userId)
        if (user) {
          truckName = user.fullname
        }
      }
    }

    let calculatedPendingAmount = 0
    let isBillPaid = true 

    data.items.forEach((item) => {
      const itemSoldPrice = parseFloat(item.sold_price || item.soldPrice)
      const itemQty = parseInt(item.quantity)

      if (item.is_paid === false) {
        isBillPaid = false 
        calculatedPendingAmount += ((itemSoldPrice) * itemQty)
      }
    })


    const trx = await Database.transaction()
    try {
      await this.cutStock(data, auth.user?.role)
      const billNo = this.generateBillNo(data)

      const sellLog = await SellLog.create({
        billNo: billNo,
        customerId: data.customerId,
        truckId: data.truckId || 0,
        truckName: truckName,
        
        totalPrice: data.items.reduce((acc, item) => {
             const price = parseFloat(item.price)
             return acc + (price * item.quantity)
        }, 0),

        totalDiscount: data.totalDiscount || 0,
        totalSoldPrice: data.totalSoldPrice || data.totalPrice,
        isCredit: data.isCredit || null,
        userId: auth.user?.id,

        pendingAmount: calculatedPendingAmount, // ยอดค้างชำระที่คำนวณจาก items ที่เป็น false
        isPaid: isBillPaid, // สถานะการจ่ายเงินของบิลหลัก (ต้องมี field นี้ใน DB)
        interest: 0, // default interest
      }, { client: trx })

      // บันทึก Items
      for (const item of data.items) {
        await SellLogItem.create({
          sellLogId: sellLog.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity,
          discount: item.discount || 0,
          soldPrice: item.sold_price || item.soldPrice, // รองรับ snake_case จาก json
          isPaid: item.is_paid !== undefined ? item.is_paid : true 
        }, { client: trx })
      }

      await trx.commit()
      
      return response.status(201).json({ billNo: billNo, message: 'Sell log created successfully', data: sellLog })
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  private generateBillNo(data){
    return `BMT-${data.customerId}-${data.truckId || '0'}-${new Date().getTime()}`
  }

  private async cutStock(data,role) {
    const trx = await Database.transaction()
    try {
      for (const item of data.items) {
        let selectedQueryModel = role == 'truck' ? TruckStock.query().where('truck_id', data.truckId) : WarehouseStock.query()
        const stock = await selectedQueryModel
          .where('product_id', item.productId)
          .first()

        if (stock) {
          stock.quantity -= item.quantity
          await stock.save({ client: trx })
        }
      }
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  public async summary({auth,request,response}){
    try{
    const startDate = moment().startOf('month').format('YYYY-MM-DD HH:mm:ss')
    const endDate = moment().endOf('month').format('YYYY-MM-DD HH:mm:ss')
    const sellLogsResult = await SellLog.query()
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .sum('total_price as total')
      .sum('total_discount as discount')
    const totalSales = sellLogsResult[0].$extras.total || 0
    const totalDiscount = sellLogsResult[0].$extras.discount || 0

    const totalProductResult = await Product.query().count('* as count')
    const totalProduct = totalProductResult[0].$extras.count

    const totalProductInStockResult = await WarehouseStock.query().count('* as count')
    const totalProductInStock = totalProductInStockResult[0].$extras.count || 0
    return response.json({totalSales,totalProduct,totalProductInStock,totalDiscount})
     
  }
  catch(err){
    console.log(err)
    return response.status(500).json({success:false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'})
  }
}
// credit section
// 1. แสดงรายการ Credit ทั้งหมด (Index) + Search
  public async indexCredit({ request, response }: HttpContextContract) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 10)
    const search = request.input('search', '')

    const query = SellLog.query()
      .where('is_paid', false) // ดึงเฉพาะบิลที่ยังไม่จ่าย
      .preload('customer')
      // .whereNotNull('is_credit') // (Option) ถ้าอยากกรองเฉพาะที่มีค่า credit
      .orderBy('created_at', 'desc')

    if (search) {
      query.where((q) => {
        q.where('bill_no', 'like', `%${search}%`)
         .orWhere('truck_name', 'like', `%${search}%`)
         .orWhereHas('customer', (cQuery) => {
           cQuery.where('name', 'like', `%${search}%`)
         })
      })
    }

    const results = await query.paginate(page, limit)
    return response.json(results)
  }

  // 2. แสดงรายละเอียด Credit และคำนวณดอกเบี้ย (ShowCredit)
  public async showCredit({ params, response }: HttpContextContract) {
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

    return response.json(sellLog)
  }

  // 3. ปิด Credit (CloseCredit)
  public async closeCredit({ params, response }: HttpContextContract) {
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

      return response.json({ message: 'Credit closed successfully', data: sellLog })
    } catch (error) {
      await trx.rollback()
      return response.status(500).json({ message: 'Failed to close credit', error: error.message })
    }
  }

  public async summaryCredit({ response }: HttpContextContract) {
    console.log('Generating credit summary report...')
    const summaries = await Database
      .from('sell_logs')
      .select('truck_name')
      
      // --- กลุ่มที่ยังไม่จ่าย (is_paid = 0 หรือ false) ---
      // 1. ยอดรวม Pending Amount
      .select(Database.raw('SUM(CASE WHEN is_paid = 0 THEN pending_amount ELSE 0 END) as total_unpaid_amount'))
      // 2. จำนวนบิล
      .select(Database.raw('COUNT(CASE WHEN is_paid = 0 THEN 1 END) as count_unpaid_bills'))
      // 3. ยอดรวม Interest
      .select(Database.raw('SUM(CASE WHEN is_paid = 0 THEN interest ELSE 0 END) as total_unpaid_interest'))

      // --- กลุ่มที่จ่ายแล้ว (is_paid = 1 หรือ true) ---
      // 4. ยอดรวมทั้งหมด (ใช้ pending_amount คือยอดเครดิตที่ปิดได้)
      .select(Database.raw('SUM(CASE WHEN is_paid = 1 THEN pending_amount ELSE 0 END) as total_paid_amount'))
      // 5. จำนวนบิล
      .select(Database.raw('COUNT(CASE WHEN is_paid = 1 THEN 1 END) as count_paid_bills'))
      // 6. ยอดรวม Interest
      .select(Database.raw('SUM(CASE WHEN is_paid = 1 THEN interest ELSE 0 END) as total_paid_interest'))

      // กรองเฉพาะที่มีชื่อรถ และ Group ตามชื่อ
      .whereNotNull('truck_name') 
      .groupBy('truck_name')
      .orderBy('truck_name', 'asc')

    // แปลงตัวเลขที่อาจจะออกมาเป็น String (ขึ้นอยู่กับ Driver DB) ให้เป็น Number
    const formattedData = summaries.map((item) => ({
      truck_name: item.truck_name,
      
      // Unpaid Group
      total_unpaid_amount: Number(item.total_unpaid_amount || 0),
      count_unpaid_bills: Number(item.count_unpaid_bills || 0),
      total_unpaid_interest: Number(item.total_unpaid_interest || 0),
      
      // Paid Group
      total_paid_amount: Number(item.total_paid_amount || 0),
      count_paid_bills: Number(item.count_paid_bills || 0),
      total_paid_interest: Number(item.total_paid_interest || 0),
    }))

    return response.json(formattedData)
  }
}
