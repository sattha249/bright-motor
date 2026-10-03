// No Adonis boot, credentials, HTTP server or database connection is used here.
// Executes the production service against a transactional repository double.
const cases = []
const test = (name, run) => cases.push({ name, run })
const assert = require('assert').strict
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')
const uuid = '30c22e8e-4c81-4e13-b6c9-df1c9751c1b2'
const actor = { id: 3, role: 'truck' }
const item = { productId: 1, quantity: 2, price: '100', sold_price: '90', discount: '10', is_paid: false }
const input = (extra = {}) => ({ truckId: 7, customerId: 42, totalPrice: 200, totalSoldPrice: 180,
  totalDiscount: 20, isCredit: 'week', items: [item], ...extra })

function harness() {
  let state = { sales: [], items: [], stocks: [
    { id: 1, truckId: 7, productId: 1, quantity: 2 },
    { id: 2, truckId: 7, productId: 2, quantity: 5 },
  ], warehouse: [{ id: 1, productId: 1, quantity: 5 }], preorders: [{
    id: 9, billNo: 'BMT-1791000000000-7-42', status: 'Pending', truckId: 7, customerId: 42,
    totalPrice: 200, totalSoldPrice: 180, totalDiscount: 20, isCredit: 'week',
    createdAt: '2026-10-01 10:00:00', items: [{ productId: 1, quantity: 2, price: 100, soldPrice: 90, discount: 10, isPaid: false }],
  }] }
  const locks = []
  let failItems = false
  let failStatus = false
  let duplicateOnInsert = null
  let transactions = 0
  let queue = Promise.resolve()
  const columns = { product_id: 'productId', truck_id: 'truckId', user_id: 'userId',
    customer_id: 'customerId', is_preorder: 'isPreorder', created_at: 'createdAt' }
  function model(table) {
    return {
      query({ client } = {}) {
        const conditions = []
        let locked = false
        return {
          where(key, value, third) { conditions.push([columns[key] || key, third === undefined ? '=' : value, third === undefined ? value : third]); return this },
          whereNull(key) { conditions.push([key, '=', null]); return this },
          preload() { return this },
          forUpdate() { locked = true; return this },
          async first() {
            const source = client ? client.state : state
            const row = source[table].find((r) => conditions.every(([k, op, v]) => op === '>=' ? r[k] >= v : r[k] == v))
            if (row && locked) locks.push(table + ':' + row.id)
            if (!row) return null
            if (table === 'preorders') row.createdAt = { toSQL: () => '2026-10-01 10:00:00' }
            return Object.assign(row, {
              async save() { if (table === 'preorders' && failStatus) throw new Error('status failure') },
              async delete() { source[table] = source[table].filter((r) => r.id !== row.id) },
              async load() {},
            })
          },
        }
      },
      async create(data, { client }) {
        if (table === 'items' && failItems) throw new Error('item failure')
        if (table === 'sales') {
          if (duplicateOnInsert) {
            state.sales.push({ ...duplicateOnInsert, id: 55 })
            duplicateOnInsert = null
            throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' })
          }
          if (client.state.sales.some((r) => r.billNo === data.billNo || (data.uuid && r.uuid === data.uuid))) {
            throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' })
          }
        }
        const row = { id: client.state[table].length + 1, ...data }
        client.state[table].push(row)
        return row
      },
    }
  }
  const db = {
    // Serial transactions mimic contention; actual MySQL lock semantics need integration testing.
    async transaction(callback) {
      transactions++
      const previous = queue
      let release
      queue = new Promise((r) => { release = r })
      await previous
      const trx = { state: JSON.parse(JSON.stringify(state)) }
      try {
        const result = await callback(trx)
        state = trx.state
        return result
      } finally { release() }
    },
  }
  const mocks = {
    '@ioc:Adonis/Lucid/Database': db,
    'App/Models/SellLog': model('sales'), 'App/Models/SellLogItem': model('items'),
    'App/Models/PreOrder': model('preorders'), 'App/Models/TruckStock': model('stocks'),
    'App/Models/WarehouseStock': model('warehouse'),
    'App/Models/Truck': { find: async (id) => id == 7 ? { id: 7, userId: 3 } : null },
    'App/Models/User': { find: async () => ({ fullname: 'Seller' }) },
  }
  const source = fs.readFileSync(path.join(__dirname, '../../app/Services/SaleService.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }, reportDiagnostics: true })
  assert.equal(compiled.diagnostics.length, 0)
  const module = { exports: {} }
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports,
    require: (name) => { assert.ok(mocks[name], name); return mocks[name] }, console })
  return { service: new module.exports.default(), locks,
    get state() { return state }, get transactions() { return transactions },
    failItems: () => { failItems = true }, failStatus: () => { failStatus = true },
    duplicateOnInsert: (sale) => { duplicateOnInsert = sale },
  }
}

test('new mobile receipt is preserved and credit/discount values remain intact', async () => {
  const h = harness()
  const result = await h.service.create(input({ billNo: `BMT-${uuid}` }), actor, uuid)
  assert.equal(result.sale.billNo, `BMT-${uuid}`)
  assert.equal(result.sale.pendingAmount, 180)
  assert.equal(result.sale.totalDiscount, 20)
  assert.equal(result.sale.isCredit, 'week')
  assert.equal(h.state.items[0].soldPrice, '90')
  assert.equal(h.state.stocks.length, 1)
  assert.equal(h.transactions, 1)
  assert.ok(h.locks.includes('stocks:1'))
})
test('lost-response retry returns same bill after stock is exhausted', async () => {
  const h = harness()
  const a = await h.service.create(input({ billNo: `BMT-${uuid}` }), actor, uuid)
  const b = await h.service.create(input({ billNo: `BMT-${uuid}` }), actor, uuid)
  assert.equal(b.created, false)
  assert.equal(a.sale.id, b.sale.id)
  assert.equal(a.sale.billNo, b.sale.billNo)
  assert.equal(h.state.sales.length, 1)
  assert.equal(h.transactions, 1)
})
test('preorder conversion uses its number and server data; retry does not sell again', async () => {
  const h = harness()
  const a = await h.service.create({ preOrderId: 9, items: [], totalSoldPrice: 1 }, actor)
  const b = await h.service.create({ preOrderId: 9 }, actor)
  assert.equal(a.sale.billNo, 'BMT-1791000000000-7-42')
  assert.equal(a.sale.totalSoldPrice, 180)
  assert.equal(a.sale.uuid, 'preorder:9')
  assert.equal(b.created, false)
  assert.equal(h.state.sales.length, 1)
  assert.equal(h.state.preorders[0].status, 'Completed')
  assert.ok(h.locks.includes('preorders:9'))
})
test('simultaneous confirmations produce one sale and one stock deduction', async () => {
  const h = harness()
  const results = await Promise.all([h.service.create({ preOrderId: 9 }, actor), h.service.create({ preOrderId: 9 }, actor)])
  assert.deepEqual(results.map((r) => r.created), [true, false])
  assert.equal(h.state.sales.length, 1)
  assert.equal(h.state.stocks.length, 1)
})
test('an item persistence failure rolls back header and stock', async () => {
  const h = harness(); h.failItems()
  await assert.rejects(h.service.create(input(), actor, uuid), /item failure/)
  assert.equal(h.state.sales.length, 0)
  assert.equal(h.state.items.length, 0)
  assert.equal(h.state.stocks[0].quantity, 2)
})
test('a preorder completion failure rolls back sale, stock and status', async () => {
  const h = harness(); h.failStatus()
  await assert.rejects(h.service.create({ preOrderId: 9 }, actor), /status failure/)
  assert.equal(h.state.sales.length, 0)
  assert.equal(h.state.preorders[0].status, 'Pending')
  assert.equal(h.state.stocks[0].quantity, 2)
})
test('duplicate-key race resolves to the already committed sale', async () => {
  const h = harness()
  h.duplicateOnInsert({ uuid, billNo: `BMT-${uuid}`, userId: 3 })
  const result = await h.service.create(input({ billNo: `BMT-${uuid}` }), actor, uuid)
  assert.equal(result.created, false)
  assert.equal(result.sale.id, 55)
  assert.equal(h.state.stocks[0].quantity, 2)
})
test('legacy web sale keeps the original number format and warehouse source', async () => {
  const h = harness()
  const result = await h.service.create(input({ truckId: 0 }), { id: 3, role: 'admin' })
  assert.match(result.sale.billNo, /^BMT-42-0-\d+$/)
  assert.equal(result.sale.uuid, null)
  assert.equal(h.state.warehouse[0].quantity, 3)
  assert.equal(h.state.stocks[0].quantity, 2)
})
test('old unsynced offline receipt is preserved; historical sale is never renumbered', async () => {
  const h = harness()
  const old = await h.service.create(input({ billNo: 'OFFLINE-1791000000000' }), actor, uuid)
  assert.equal(old.sale.billNo, 'OFFLINE-1791000000000')
  const retry = await h.service.create(input({ billNo: `BMT-${uuid}` }), actor, uuid)
  assert.equal(retry.sale.billNo, old.sale.billNo)
})
test('completed or cancelled legacy preorder cannot create a new sale', async () => {
  for (const status of ['Completed', 'Cancelled', 'Synced']) {
    const h = harness(); h.state.preorders[0].status = status
    await assert.rejects(h.service.create({ preOrderId: 9 }, actor), (e) => e.status === 409)
    assert.equal(h.state.sales.length, 0)
    assert.equal(h.state.stocks[0].quantity, 2)
  }
})
test('invalid bill numbers, quantities and reserved keys do not touch stock', async () => {
  for (const data of [input({ billNo: 'arbitrary' }), input({ items: [{ ...item, quantity: -1 }] }),
    input({ items: [] }), { preOrderId: '9' }, input({ items: [{ ...item, sold_price: 'invalid' }] })]) {
    const h = harness()
    await assert.rejects(h.service.create(data, actor, uuid))
    assert.equal(h.state.sales.length, 0)
    assert.equal(h.state.stocks[0].quantity, 2)
  }
  await assert.rejects(harness().service.create(input(), actor, 'preorder:9'))
})
test('sale reference and preorder cannot be replayed by another user', async () => {
  const h = harness()
  await h.service.create(input(), actor, uuid)
  await assert.rejects(h.service.create(input(), { id: 99, role: 'truck' }, uuid), (e) => e.status === 409)
  await assert.rejects(harness().service.create({ preOrderId: 9 }, { id: 99, role: 'truck' }), (e) => e.status === 403)
})
test('an insufficient second product rolls back an earlier deduction', async () => {
  const h = harness()
  await assert.rejects(h.service.create(input({ items: [item, { ...item, productId: 2, quantity: 6 }] }), actor, uuid),
    /Not enough stock/)
  assert.equal(h.state.sales.length, 0)
  assert.equal(h.state.stocks[0].quantity, 2)
  assert.equal(h.state.stocks[1].quantity, 5)
})

test('a pending legacy preorder with an unlinked committed sale fails closed', async () => {
  const h = harness()
  h.state.sales.push({ id: 11, uuid: null, truckId: 7, customerId: 42, isPreorder: true,
    createdAt: '2026-10-02 10:00:00', userId: 3, billNo: 'BMT-legacy-sale' })
  await assert.rejects(h.service.create({ preOrderId: 9 }, actor), (e) => e.status === 409)
  assert.equal(h.state.sales.length, 1)
  assert.equal(h.state.stocks[0].quantity, 2)
  assert.equal(h.state.preorders[0].status, 'Pending')
})

;(async () => {
  let failed = 0
  for (const entry of cases) {
    try { await entry.run(); console.log('PASS ' + entry.name) }
    catch (error) { failed++; console.error('FAIL ' + entry.name, error) }
  }
  console.log(`${cases.length - failed}/${cases.length} tests passed (isolated; no live database)`)
  process.exitCode = failed ? 1 : 0
})()
