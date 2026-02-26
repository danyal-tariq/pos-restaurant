import { getDatabase } from '../database'

export interface Category {
  id: number
  name: string
  color: string
  icon: string
  sort_order: number
  active: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  image_path: string | null
  sku: string | null
  active: number
  track_inventory: number
  created_at: string
  updated_at: string
}

export interface Modifier {
  id: number
  group_id: number
  name: string
  price_delta: number
}

export interface ModifierGroup {
  id: number
  name: string
  required: number
  multi_select: number
  min_select: number
  max_select: number
  modifiers?: Modifier[]
}

export function getCategories(): Category[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all() as Category[]
}

export function getCategoryById(id: number): Category | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined
}

export function createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Category {
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO categories (name, color, icon, sort_order, active)
       VALUES (@name, @color, @icon, @sort_order, @active)`
    )
    .run(data)
  return getCategoryById(result.lastInsertRowid as number)!
}

export function updateCategory(
  id: number,
  data: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>
): Category {
  const db = getDatabase()
  const existing = getCategoryById(id)!
  const updated = { ...existing, ...data }
  db.prepare(
    `UPDATE categories SET name=@name, color=@color, icon=@icon, sort_order=@sort_order, active=@active,
     updated_at=datetime('now') WHERE id=@id`
  ).run({ ...updated, id })
  return getCategoryById(id)!
}

export function deleteCategory(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

export function getProducts(includeInactive = false): (Product & { category_name: string })[] {
  const db = getDatabase()
  const sql = `SELECT p.*, c.name as category_name FROM products p
    JOIN categories c ON c.id = p.category_id
    ${includeInactive ? '' : 'WHERE p.active = 1'}
    ORDER BY c.sort_order, p.name`
  return db.prepare(sql).all() as (Product & { category_name: string })[]
}

export function getProductById(id: number): Product | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined
}

export function getProductsByCategoryId(categoryId: number): Product[] {
  const db = getDatabase()
  return db
    .prepare('SELECT * FROM products WHERE category_id = ? AND active = 1 ORDER BY name')
    .all(categoryId) as Product[]
}

export function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO products (category_id, name, description, price, image_path, sku, active, track_inventory)
       VALUES (@category_id, @name, @description, @price, @image_path, @sku, @active, @track_inventory)`
    )
    .run(data)
  return getProductById(result.lastInsertRowid as number)!
}

export function updateProduct(
  id: number,
  data: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
): Product {
  const db = getDatabase()
  const existing = getProductById(id)!
  const updated = { ...existing, ...data }
  db.prepare(
    `UPDATE products SET category_id=@category_id, name=@name, description=@description, price=@price,
     image_path=@image_path, sku=@sku, active=@active, track_inventory=@track_inventory,
     updated_at=datetime('now') WHERE id=@id`
  ).run({ ...updated, id })
  return getProductById(id)!
}

export function deleteProduct(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM products WHERE id = ?').run(id)
}

export function getModifierGroupsForProduct(productId: number): ModifierGroup[] {
  const db = getDatabase()
  const groups = db
    .prepare(
      `SELECT mg.* FROM modifier_groups mg
       JOIN product_modifier_groups pmg ON pmg.group_id = mg.id
       WHERE pmg.product_id = ?`
    )
    .all(productId) as ModifierGroup[]
  for (const group of groups) {
    group.modifiers = db
      .prepare('SELECT * FROM modifiers WHERE group_id = ?')
      .all(group.id) as Modifier[]
  }
  return groups
}

export function getAllModifierGroups(): ModifierGroup[] {
  const db = getDatabase()
  const groups = db.prepare('SELECT * FROM modifier_groups').all() as ModifierGroup[]
  for (const group of groups) {
    group.modifiers = db
      .prepare('SELECT * FROM modifiers WHERE group_id = ?')
      .all(group.id) as Modifier[]
  }
  return groups
}

export function createModifierGroup(
  data: Omit<ModifierGroup, 'id' | 'modifiers'>,
  modifiers: Omit<Modifier, 'id' | 'group_id'>[]
): ModifierGroup {
  const db = getDatabase()
  const tx = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO modifier_groups (name, required, multi_select, min_select, max_select)
         VALUES (@name, @required, @multi_select, @min_select, @max_select)`
      )
      .run(data)
    const groupId = result.lastInsertRowid as number
    for (const mod of modifiers) {
      db.prepare('INSERT INTO modifiers (group_id, name, price_delta) VALUES (?, ?, ?)').run(
        groupId,
        mod.name,
        mod.price_delta
      )
    }
    return groupId
  })
  const groupId = tx()
  return getAllModifierGroups().find((g) => g.id === groupId)!
}

export function assignModifierGroupToProduct(productId: number, groupId: number): void {
  const db = getDatabase()
  db.prepare(
    'INSERT OR IGNORE INTO product_modifier_groups (product_id, group_id) VALUES (?, ?)'
  ).run(productId, groupId)
}

export function removeModifierGroupFromProduct(productId: number, groupId: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM product_modifier_groups WHERE product_id = ? AND group_id = ?').run(
    productId,
    groupId
  )
}

export function searchProducts(query: string): (Product & { category_name: string })[] {
  const db = getDatabase()
  const like = `%${query}%`
  return db
    .prepare(
      `SELECT p.*, c.name as category_name FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.active = 1 AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)
       ORDER BY p.name`
    )
    .all(like, like, like) as (Product & { category_name: string })[]
}
