import { getDatabase } from '../database'

export interface InventoryItem {
  id: number
  name: string
  unit: string
  quantity: number
  threshold: number
  cost_per_unit: number
  created_at: string
  updated_at: string
}

export interface InventoryAdjustment {
  id?: number
  inventory_item_id: number
  quantity_delta: number
  reason: string
  employee_id?: number | null
  created_at?: string
}

export function getAllInventoryItems(): InventoryItem[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM inventory_items ORDER BY name').all() as InventoryItem[]
}

export function getLowStockItems(): InventoryItem[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM inventory_items WHERE quantity <= threshold ORDER BY quantity ASC')
    .all() as InventoryItem[]
}

export function getInventoryItemById(id: number): InventoryItem | undefined {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM inventory_items WHERE id = ?')
    .get(id) as InventoryItem | undefined
}

export function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
): InventoryItem {
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO inventory_items (name, unit, quantity, threshold, cost_per_unit)
       VALUES (@name, @unit, @quantity, @threshold, @cost_per_unit)`
    )
    .run(data)
  return getInventoryItemById(result.lastInsertRowid as number)!
}

export function updateInventoryItem(
  id: number,
  data: Partial<Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>>
): InventoryItem {
  const db = getDatabase()
  const existing = getInventoryItemById(id)!
  const updated = { ...existing, ...data }
  db.prepare(
    `UPDATE inventory_items SET name=@name, unit=@unit, quantity=@quantity, threshold=@threshold,
     cost_per_unit=@cost_per_unit, updated_at=datetime('now') WHERE id=@id`
  ).run({ ...updated, id })
  return getInventoryItemById(id)!
}

export function deleteInventoryItem(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(id)
}

export function adjustInventory(
  itemId: number,
  quantityDelta: number,
  reason: string,
  employeeId?: number
): void {
  const db = getDatabase()
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE inventory_items SET quantity = quantity + ?, updated_at=datetime('now') WHERE id = ?`
    ).run(quantityDelta, itemId)
    db.prepare(
      `INSERT INTO inventory_adjustments (inventory_item_id, quantity_delta, reason, employee_id)
       VALUES (?, ?, ?, ?)`
    ).run(itemId, quantityDelta, reason, employeeId ?? null)
  })
  tx()
}

export function getAdjustmentHistory(itemId: number): InventoryAdjustment[] {
  const db = getDatabase()
  return db
    .prepare(
      'SELECT * FROM inventory_adjustments WHERE inventory_item_id = ? ORDER BY created_at DESC LIMIT 100'
    )
    .all(itemId) as InventoryAdjustment[]
}

export interface ProductIngredient {
  inventory_item_id: number
  quantity_used: number
  item_name?: string
  unit?: string
}

export function getProductIngredients(productId: number): ProductIngredient[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT pi.*, i.name as item_name, i.unit FROM product_ingredients pi
       JOIN inventory_items i ON i.id = pi.inventory_item_id
       WHERE pi.product_id = ?`
    )
    .all(productId) as ProductIngredient[]
}

export function setProductIngredients(
  productId: number,
  ingredients: { inventory_item_id: number; quantity_used: number }[]
): void {
  const db = getDatabase()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM product_ingredients WHERE product_id = ?').run(productId)
    for (const ing of ingredients) {
      db.prepare(
        'INSERT INTO product_ingredients (product_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)'
      ).run(productId, ing.inventory_item_id, ing.quantity_used)
    }
  })
  tx()
}

export function getInventoryValuation(): { total_value: number; items: (InventoryItem & { value: number })[] } {
  const db = getDatabase()
  const items = db
    .prepare('SELECT *, (quantity * cost_per_unit) as value FROM inventory_items ORDER BY name')
    .all() as (InventoryItem & { value: number })[]
  const total_value = items.reduce((acc, i) => acc + i.value, 0)
  return { total_value, items }
}
