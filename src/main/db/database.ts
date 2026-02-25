import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, 'pos.db')
  db = new Database(dbPath)

  // Performance optimisations
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  runMigrations(db)
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `)

  const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as
    | { version: number }
    | undefined
  const currentVersion = row?.version ?? 0

  if (currentVersion < 1) {
    db.exec(MIGRATION_001)
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(1)
    seedDefaultData(db)
  }
}

function seedDefaultData(db: Database.Database): void {
  // Default settings
  const settingInsert = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  const settings = [
    ['shop_name', 'My Fast Food Shop'],
    ['shop_address', '123 Main Street'],
    ['shop_phone', '555-0100'],
    ['shop_email', ''],
    ['tax_rate', '8'],
    ['tax_inclusive', 'false'],
    ['currency_symbol', '$'],
    ['receipt_footer', 'Thank you for your order!'],
    ['printer_type', 'none'],
    ['printer_usb_vendor', ''],
    ['printer_usb_product', ''],
    ['printer_network_ip', ''],
    ['printer_network_port', '9100'],
    ['theme', 'light'],
    ['order_number_prefix', 'ORD'],
    ['receipt_logo', '']
  ]
  const insertMany = db.transaction(() => {
    for (const [key, value] of settings) {
      settingInsert.run(key, value)
    }
  })
  insertMany()

  // Default categories
  const catInsert = db.prepare(
    'INSERT OR IGNORE INTO categories (name, color, sort_order, icon) VALUES (?, ?, ?, ?)'
  )
  const categories = [
    ['Burgers', '#EF4444', 1, '🍔'],
    ['Pizzas', '#F97316', 2, '🍕'],
    ['Sides', '#EAB308', 3, '🍟'],
    ['Drinks', '#3B82F6', 4, '🥤'],
    ['Desserts', '#EC4899', 5, '🍦'],
    ['Others', '#6B7280', 6, '📦']
  ]
  const insertCats = db.transaction(() => {
    for (const [name, color, sort_order, icon] of categories) {
      catInsert.run(name, color, sort_order, icon)
    }
  })
  insertCats()

  // Default admin employee
  db.prepare(
    `INSERT OR IGNORE INTO employees (name, pin, role, active) VALUES (?, ?, ?, ?)`
  ).run('Admin', '1234', 'admin', 1)
}

const MIGRATION_001 = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280',
    icon TEXT NOT NULL DEFAULT '📦',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_path TEXT,
    sku TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    track_inventory INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS modifier_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 0,
    multi_select INTEGER NOT NULL DEFAULT 0,
    min_select INTEGER NOT NULL DEFAULT 0,
    max_select INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_delta REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS product_modifier_groups (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, group_id)
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pcs',
    quantity REAL NOT NULL DEFAULT 0,
    threshold REAL NOT NULL DEFAULT 10,
    cost_per_unit REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_used REAL NOT NULL DEFAULT 1,
    PRIMARY KEY (product_id, inventory_item_id)
  );

  CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_delta REAL NOT NULL,
    reason TEXT NOT NULL,
    employee_id INTEGER REFERENCES employees(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    opened_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT,
    opening_float REAL NOT NULL DEFAULT 0,
    closing_cash REAL,
    total_sales REAL,
    total_orders INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    shift_id INTEGER REFERENCES shifts(id),
    employee_id INTEGER REFERENCES employees(id),
    order_type TEXT NOT NULL DEFAULT 'dine_in',
    table_number TEXT,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    modifiers_json TEXT,
    modifiers_price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method TEXT NOT NULL DEFAULT 'cash',
    amount REAL NOT NULL,
    tendered REAL,
    change_given REAL,
    reference TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL,
    code TEXT,
    min_order_amount REAL NOT NULL DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    days_of_week TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_id INTEGER REFERENCES discounts(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    amount REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`
