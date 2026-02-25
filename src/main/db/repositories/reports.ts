import { getDatabase } from '../database'

export interface DashboardStats {
  today_revenue: number
  today_orders: number
  avg_order_value: number
  top_products: { product_name: string; qty: number; revenue: number }[]
  pending_orders: number
  low_stock_count: number
}

export interface SalesDataPoint {
  period: string
  revenue: number
  orders: number
}

export interface ProductSalesRow {
  product_id: number
  product_name: string
  qty: number
  revenue: number
  category_name: string
}

export interface CategorySalesRow {
  category_name: string
  revenue: number
  orders: number
}

export interface PaymentSummary {
  method: string
  total_amount: number
  count: number
}

export function getDashboardStats(): DashboardStats {
  const db = getDatabase()

  const todayStats = db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(total), 0) as rev
       FROM orders WHERE date(created_at) = date('now') AND status != 'voided'`
    )
    .get() as { cnt: number; rev: number }

  const topProducts = db
    .prepare(
      `SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.quantity * (oi.unit_price + oi.modifiers_price)) as revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE date(o.created_at) = date('now') AND o.status != 'voided'
       GROUP BY oi.product_name ORDER BY qty DESC LIMIT 5`
    )
    .all() as { product_name: string; qty: number; revenue: number }[]

  const pendingOrders = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('pending','preparing')")
      .get() as { cnt: number }
  ).cnt

  const lowStockCount = (
    db
      .prepare('SELECT COUNT(*) as cnt FROM inventory_items WHERE quantity <= threshold')
      .get() as { cnt: number }
  ).cnt

  return {
    today_revenue: todayStats.rev,
    today_orders: todayStats.cnt,
    avg_order_value: todayStats.cnt > 0 ? todayStats.rev / todayStats.cnt : 0,
    top_products: topProducts,
    pending_orders: pendingOrders,
    low_stock_count: lowStockCount
  }
}

export function getSalesByHour(date: string): SalesDataPoint[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT strftime('%H', created_at) as period, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders WHERE date(created_at) = ? AND status != 'voided'
       GROUP BY period ORDER BY period`
    )
    .all(date) as SalesDataPoint[]
  return rows
}

export function getSalesByDay(startDate: string, endDate: string): SalesDataPoint[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT date(created_at) as period, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders WHERE date(created_at) BETWEEN ? AND ? AND status != 'voided'
       GROUP BY period ORDER BY period`
    )
    .all(startDate, endDate) as SalesDataPoint[]
}

export function getSalesByMonth(year: number): SalesDataPoint[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) as period, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
       FROM orders WHERE strftime('%Y', created_at) = ? AND status != 'voided'
       GROUP BY period ORDER BY period`
    )
    .all(String(year)) as SalesDataPoint[]
}

export function getProductSalesReport(startDate: string, endDate: string): ProductSalesRow[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as qty,
              SUM(oi.quantity * (oi.unit_price + oi.modifiers_price)) as revenue,
              c.name as category_name
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE date(o.created_at) BETWEEN ? AND ? AND o.status != 'voided'
       GROUP BY oi.product_id, oi.product_name ORDER BY qty DESC`
    )
    .all(startDate, endDate) as ProductSalesRow[]
}

export function getCategorySalesReport(startDate: string, endDate: string): CategorySalesRow[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT c.name as category_name, COALESCE(SUM(oi.quantity * (oi.unit_price + oi.modifiers_price)), 0) as revenue,
              COUNT(DISTINCT o.id) as orders
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND date(o.created_at) BETWEEN ? AND ? AND o.status != 'voided'
       GROUP BY c.id, c.name ORDER BY revenue DESC`
    )
    .all(startDate, endDate) as CategorySalesRow[]
}

export function getPaymentSummary(startDate: string, endDate: string): PaymentSummary[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT p.method, SUM(p.amount) as total_amount, COUNT(*) as count
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE date(o.created_at) BETWEEN ? AND ? AND o.status != 'voided'
       GROUP BY p.method ORDER BY total_amount DESC`
    )
    .all(startDate, endDate) as PaymentSummary[]
}

export function getEmployeeSalesReport(
  startDate: string,
  endDate: string
): { employee_name: string; orders: number; revenue: number }[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT e.name as employee_name, COUNT(*) as orders, COALESCE(SUM(o.total), 0) as revenue
       FROM orders o
       JOIN employees e ON e.id = o.employee_id
       WHERE date(o.created_at) BETWEEN ? AND ? AND o.status != 'voided'
       GROUP BY e.id ORDER BY revenue DESC`
    )
    .all(startDate, endDate) as { employee_name: string; orders: number; revenue: number }[]
}
