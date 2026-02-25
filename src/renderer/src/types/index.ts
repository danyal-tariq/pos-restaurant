// ── Shared domain types (mirrors the DB shape) ───────────────────────────────

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
  category_name?: string
  name: string
  description: string | null
  price: number
  cost?: number                  // optional cost price
  image_path: string | null
  sku: string | null
  active: number
  is_active?: boolean            // alias for active !== 0
  track_inventory: number
  stock_quantity?: number        // optional tracked stock
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

export interface CartItem {
  id: string                     // local uuid
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  modifiers: { modifier_id: number; name: string; price_delta: number }[]
  modifiers_price: number
  notes: string
  line_total: number
}

export interface AppliedDiscount {
  discount_id?: number | null
  name: string
  type: 'percentage' | 'fixed'
  value: number
  amount: number
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'card' | 'split'

export interface OrderSummary {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
}

export interface Order {
  id: number
  order_number: string
  shift_id: number | null
  employee_id: number | null
  order_type: OrderType
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
  items?: OrderItemRecord[]
  payments?: PaymentRecord[]
  discounts?: AppliedDiscount[]
}

export interface OrderItemRecord {
  id: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  modifiers_json: string | null
  modifiers_price: number
  notes: string | null
  status: string
}

export interface PaymentRecord {
  id: number
  order_id: number
  method: PaymentMethod
  amount: number
  tendered: number | null
  change_given: number | null
  reference: string | null
  created_at: string
}

export interface Employee {
  id: number
  name: string
  pin: string
  role: 'admin' | 'manager' | 'cashier'
  active: number
  is_active?: boolean            // alias: active !== 0
  hourly_rate?: number           // optional pay rate
  created_at: string
  updated_at: string
}

export interface Shift {
  id: number
  employee_id: number
  employee_name?: string
  opened_at: string
  closed_at: string | null
  opening_float: number
  closing_cash: number | null
  total_cash?: number            // total cash collected
  total_card?: number            // total card collected
  total_sales: number | null
  total_orders: number | null
  notes: string | null
}

export interface InventoryItem {
  id: number
  name: string
  unit: string
  quantity: number          // DB column: quantity
  threshold: number         // DB column: threshold (min stock level)
  cost_per_unit: number
  created_at: string
  updated_at: string
  // Aliases for convenience (same values)
  current_stock?: number
  min_stock_level?: number
}

export interface Discount {
  id: number
  name: string
  type: 'percentage' | 'fixed'
  value: number
  code: string | null
  min_order_amount: number
  max_uses: number
  uses_count: number
  start_time: string | null
  end_time: string | null
  days_of_week: number[] | null
  is_active: boolean
  created_at: string
}

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

export interface AppSettings {
  shop_name: string
  shop_address: string
  shop_phone: string
  shop_email: string
  tax_rate: string
  tax_inclusive: string
  currency_symbol: string
  receipt_footer: string
  printer_type: string
  printer_network_ip: string
  printer_network_port: string
  theme: string
  order_number_prefix: string
}
