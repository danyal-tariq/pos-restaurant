import { getDatabase } from '../database'

export interface Discount {
  id: number
  name: string
  type: 'percentage' | 'fixed'
  value: number
  code: string | null
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  start_time: string | null
  end_time: string | null
  days_of_week: string | null
  active: number
  created_at: string
}

export function getAllDiscounts(includeInactive = false): Discount[] {
  const db = getDatabase()
  const sql = `SELECT * FROM discounts ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY name`
  return db.prepare(sql).all() as Discount[]
}

export function getDiscountById(id: number): Discount | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM discounts WHERE id = ?').get(id) as Discount | undefined
}

export function getDiscountByCode(code: string): Discount | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM discounts WHERE code = ? AND active = 1').get(code) as
    | Discount
    | undefined
}

export function createDiscount(data: Omit<Discount, 'id' | 'uses_count' | 'created_at'>): Discount {
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO discounts (name, type, value, code, min_order_amount, max_uses, start_time, end_time, days_of_week, active)
       VALUES (@name, @type, @value, @code, @min_order_amount, @max_uses, @start_time, @end_time, @days_of_week, @active)`
    )
    .run(data)
  return getDiscountById(result.lastInsertRowid as number)!
}

export function updateDiscount(
  id: number,
  data: Partial<Omit<Discount, 'id' | 'uses_count' | 'created_at'>>
): Discount {
  const db = getDatabase()
  const existing = getDiscountById(id)!
  const updated = { ...existing, ...data }
  db.prepare(
    `UPDATE discounts SET name=@name, type=@type, value=@value, code=@code, min_order_amount=@min_order_amount,
     max_uses=@max_uses, start_time=@start_time, end_time=@end_time, days_of_week=@days_of_week, active=@active
     WHERE id=@id`
  ).run({ ...updated, id })
  return getDiscountById(id)!
}

export function deleteDiscount(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM discounts WHERE id = ?').run(id)
}

export function validateDiscount(
  discountId: number,
  orderSubtotal: number
): { valid: boolean; reason?: string } {
  const discount = getDiscountById(discountId)
  if (!discount || !discount.active)
    return { valid: false, reason: 'Discount not found or inactive' }
  if (discount.max_uses && discount.uses_count >= discount.max_uses)
    return { valid: false, reason: 'Discount has reached maximum uses' }
  if (orderSubtotal < discount.min_order_amount)
    return {
      valid: false,
      reason: `Minimum order amount is $${discount.min_order_amount.toFixed(2)}`
    }

  // Check time-based validity
  if (discount.start_time || discount.end_time) {
    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5) // HH:MM
    if (discount.start_time && timeStr < discount.start_time)
      return { valid: false, reason: 'Discount not yet active (happy hour)' }
    if (discount.end_time && timeStr > discount.end_time)
      return { valid: false, reason: 'Discount has expired (happy hour)' }
  }

  // Check day of week
  if (discount.days_of_week) {
    const days = discount.days_of_week.split(',').map((d) => parseInt(d.trim(), 10))
    const currentDay = new Date().getDay()
    if (!days.includes(currentDay)) return { valid: false, reason: 'Discount not valid today' }
  }

  return { valid: true }
}

export function calculateDiscountAmount(discount: Discount, subtotal: number): number {
  if (discount.type === 'percentage') {
    return Math.min((subtotal * discount.value) / 100, subtotal)
  }
  return Math.min(discount.value, subtotal)
}

// Get auto-applicable discounts (happy hour, day-based)
export function getAutoApplicableDiscounts(orderSubtotal: number): Discount[] {
  const db = getDatabase()
  const activeDiscounts = db
    .prepare('SELECT * FROM discounts WHERE active = 1 AND code IS NULL')
    .all() as Discount[]
  return activeDiscounts.filter((d) => validateDiscount(d.id, orderSubtotal).valid)
}
