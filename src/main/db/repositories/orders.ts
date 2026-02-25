import { getDatabase } from '../database'

export interface OrderItem {
  id?: number
  order_id?: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  modifiers_json?: string | null
  modifiers_price: number
  notes?: string | null
  status?: string
}

export interface Payment {
  id?: number
  order_id?: number
  method: 'cash' | 'card' | 'split'
  amount: number
  tendered?: number | null
  change_given?: number | null
  reference?: string | null
}

export interface AppliedDiscount {
  discount_id?: number | null
  name: string
  type: string
  value: number
  amount: number
}

export interface Order {
  id: number
  order_number: string
  shift_id: number | null
  employee_id: number | null
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  table_number: string | null
  customer_name: string | null
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'voided'
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type OrderWithItems = Order & {
  items: OrderItem[]
  payments: Payment[]
  discounts: AppliedDiscount[]
}

function generateOrderNumber(): string {
  const db = getDatabase()
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'order_number_prefix'").get() as
    | { value: string }
    | undefined
  const prefix = setting?.value ?? 'ORD'
  const lastOrder = db
    .prepare("SELECT order_number FROM orders ORDER BY id DESC LIMIT 1")
    .get() as { order_number: string } | undefined
  let nextNum = 1
  if (lastOrder) {
    const parts = lastOrder.order_number.split('-')
    const last = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(last)) nextNum = last + 1
  }
  return `${prefix}-${String(nextNum).padStart(4, '0')}`
}

export function createOrder(
  data: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>,
  items: OrderItem[],
  payments: Payment[],
  appliedDiscounts: AppliedDiscount[]
): OrderWithItems {
  const db = getDatabase()
  const tx = db.transaction(() => {
    const orderNumber = generateOrderNumber()
    const result = db
      .prepare(
        `INSERT INTO orders (order_number, shift_id, employee_id, order_type, table_number,
         customer_name, status, subtotal, discount_amount, tax_amount, total, notes)
         VALUES (@order_number, @shift_id, @employee_id, @order_type, @table_number,
         @customer_name, @status, @subtotal, @discount_amount, @tax_amount, @total, @notes)`
      )
      .run({ ...data, order_number: orderNumber })
    const orderId = result.lastInsertRowid as number

    for (const item of items) {
      db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price,
         modifiers_json, modifiers_price, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderId,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.modifiers_json ?? null,
        item.modifiers_price,
        item.notes ?? null,
        'pending'
      )
    }

    for (const payment of payments) {
      db.prepare(
        `INSERT INTO payments (order_id, method, amount, tendered, change_given, reference)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        orderId,
        payment.method,
        payment.amount,
        payment.tendered ?? null,
        payment.change_given ?? null,
        payment.reference ?? null
      )
    }

    for (const disc of appliedDiscounts) {
      db.prepare(
        `INSERT INTO order_discounts (order_id, discount_id, name, type, value, amount)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(orderId, disc.discount_id ?? null, disc.name, disc.type, disc.value, disc.amount)
      if (disc.discount_id) {
        db.prepare(
          'UPDATE discounts SET uses_count = uses_count + 1 WHERE id = ?'
        ).run(disc.discount_id)
      }
    }

    // Deduct inventory
    for (const item of items) {
      const ingredients = db
        .prepare('SELECT * FROM product_ingredients WHERE product_id = ?')
        .all(item.product_id) as { inventory_item_id: number; quantity_used: number }[]
      for (const ing of ingredients) {
        db.prepare(
          'UPDATE inventory_items SET quantity = quantity - ?, updated_at = datetime(\'now\') WHERE id = ?'
        ).run(ing.quantity_used * item.quantity, ing.inventory_item_id)
      }
    }

    return orderId
  })

  const orderId = tx()
  return getOrderById(orderId)!
}

export function getOrderById(id: number): OrderWithItems | undefined {
  const db = getDatabase()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined
  if (!order) return undefined
  return enrichOrder(order)
}

export function getOrderByNumber(orderNumber: string): OrderWithItems | undefined {
  const db = getDatabase()
  const order = db
    .prepare('SELECT * FROM orders WHERE order_number = ?')
    .get(orderNumber) as Order | undefined
  if (!order) return undefined
  return enrichOrder(order)
}

function enrichOrder(order: Order): OrderWithItems {
  const db = getDatabase()
  const items = db
    .prepare(
      `SELECT *, (unit_price + modifiers_price) * quantity AS line_total
       FROM order_items WHERE order_id = ? ORDER BY id`
    )
    .all(order.id) as OrderItem[]
  const payments = db
    .prepare('SELECT * FROM payments WHERE order_id = ?')
    .all(order.id) as Payment[]
  const discounts = db
    .prepare('SELECT * FROM order_discounts WHERE order_id = ?')
    .all(order.id) as AppliedDiscount[]
  return { ...order, items, payments, discounts }
}

export function updateOrderStatus(id: number, status: Order['status']): void {
  const db = getDatabase()
  db.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id)
}

export function updateOrderItemStatus(itemId: number, status: string): void {
  const db = getDatabase()
  db.prepare('UPDATE order_items SET status = ? WHERE id = ?').run(status, itemId)
}

export function voidOrder(id: number, _employeeId: number): void {
  const db = getDatabase()
  db.prepare(
    "UPDATE orders SET status = 'voided', updated_at = datetime('now') WHERE id = ?"
  ).run(id)
}

export function getActiveOrders(): OrderWithItems[] {
  const db = getDatabase()
  const orders = db
    .prepare(
      "SELECT * FROM orders WHERE status IN ('pending','preparing') ORDER BY created_at DESC LIMIT 50"
    )
    .all() as Order[]
  return orders.map(enrichOrder)
}

export function getOrdersPage(
  page: number,
  pageSize: number,
  filter?: { status?: string; startDate?: string; endDate?: string; search?: string }
): { rows: (Order & { item_count: number })[]; total: number } {
  const db = getDatabase()
  let where = '1=1'
  const params: (string | number)[] = []
  if (filter?.status) {
    where += ` AND o.status = ?`
    params.push(filter.status)
  }
  if (filter?.startDate) {
    where += ` AND o.created_at >= ?`
    params.push(filter.startDate)
  }
  if (filter?.endDate) {
    where += ` AND o.created_at <= ?`
    params.push(filter.endDate)
  }
  if (filter?.search) {
    where += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ?)`
    params.push(`%${filter.search}%`, `%${filter.search}%`)
  }
  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM orders o WHERE ${where}`).get(...params) as { cnt: number }
  ).cnt
  const offset = (page - 1) * pageSize
  const rows = db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as (Order & { item_count: number })[]
  return { rows, total }
}

export function addPaymentToOrder(orderId: number, payment: Payment): OrderWithItems {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO payments (order_id, method, amount, tendered, change_given, reference)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    orderId,
    payment.method,
    payment.amount,
    payment.tendered ?? null,
    payment.change_given ?? null,
    payment.reference ?? null
  )
  db.prepare(
    "UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
  ).run(orderId)
  return getOrderById(orderId)!
}

export function getTodaysOrders(): OrderWithItems[] {
  const db = getDatabase()
  const orders = db
    .prepare(
      `SELECT * FROM orders WHERE date(created_at,'localtime') = date('now','localtime') AND status != 'voided' ORDER BY created_at DESC`
    )
    .all() as Order[]
  return orders.map(enrichOrder)
}
