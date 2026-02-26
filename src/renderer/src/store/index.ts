import { create } from 'zustand'
import type {
  CartItem,
  AppliedDiscount,
  OrderType,
  Employee,
  Shift,
  AppSettings,
  OrderSummary
} from '../types'

// ── Cart Store ────────────────────────────────────────────────────────────────
interface CartState {
  items: CartItem[]
  orderType: OrderType
  tableNumber: string
  customerName: string
  notes: string
  appliedDiscounts: AppliedDiscount[]
  heldOrders: { id: string; label: string; items: CartItem[]; discounts: AppliedDiscount[] }[]

  addItem: (item: Omit<CartItem, 'id' | 'line_total'>) => void
  updateItemQty: (id: string, qty: number) => void
  updateItemNotes: (id: string, notes: string) => void
  removeItem: (id: string) => void
  clearCart: () => void
  setOrderType: (type: OrderType) => void
  setTableNumber: (t: string) => void
  setCustomerName: (n: string) => void
  setNotes: (n: string) => void
  applyDiscount: (discount: AppliedDiscount) => void
  removeDiscount: (index: number) => void
  holdCurrentOrder: (label: string) => void
  resumeHeldOrder: (id: string) => void
  deleteHeldOrder: (id: string) => void
  calcSummary: (taxRate: number, taxInclusive: boolean) => OrderSummary
}

let itemIdCounter = 0

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableNumber: '',
  customerName: '',
  notes: '',
  appliedDiscounts: [],
  heldOrders: [],

  addItem: (item) => {
    set((state) => {
      // Check if same product + same modifiers exists
      const modKey = JSON.stringify(item.modifiers.map((m) => m.modifier_id).sort())
      const existing = state.items.find(
        (i) =>
          i.product_id === item.product_id &&
          JSON.stringify(i.modifiers.map((m) => m.modifier_id).sort()) === modKey
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === existing.id
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  line_total: (i.quantity + item.quantity) * (i.unit_price + i.modifiers_price)
                }
              : i
          )
        }
      }
      itemIdCounter++
      const newItem: CartItem = {
        ...item,
        id: `item-${itemIdCounter}-${Date.now()}`,
        line_total: item.quantity * (item.unit_price + item.modifiers_price)
      }
      return { items: [...state.items, newItem] }
    })
  },

  updateItemQty: (id, qty) => {
    if (qty < 1) {
      get().removeItem(id)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? { ...i, quantity: qty, line_total: qty * (i.unit_price + i.modifiers_price) }
          : i
      )
    }))
  },

  updateItemNotes: (id, notes) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, notes } : i))
    }))
  },

  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  clearCart: () =>
    set({
      items: [],
      appliedDiscounts: [],
      tableNumber: '',
      customerName: '',
      notes: '',
      orderType: 'dine_in'
    }),

  setOrderType: (type) => set({ orderType: type }),
  setTableNumber: (t) => set({ tableNumber: t }),
  setCustomerName: (n) => set({ customerName: n }),
  setNotes: (n) => set({ notes: n }),

  applyDiscount: (discount) =>
    set((state) => ({ appliedDiscounts: [...state.appliedDiscounts, discount] })),

  removeDiscount: (index) =>
    set((state) => ({
      appliedDiscounts: state.appliedDiscounts.filter((_, i) => i !== index)
    })),

  holdCurrentOrder: (label) => {
    const state = get()
    if (state.items.length === 0) return
    const heldId = `held-${Date.now()}`
    set((s) => ({
      heldOrders: [
        ...s.heldOrders,
        { id: heldId, label, items: s.items, discounts: s.appliedDiscounts }
      ],
      items: [],
      appliedDiscounts: [],
      tableNumber: '',
      customerName: '',
      notes: ''
    }))
  },

  resumeHeldOrder: (id) => {
    set((state) => {
      const held = state.heldOrders.find((h) => h.id === id)
      if (!held) return state
      return {
        items: held.items,
        appliedDiscounts: held.discounts,
        heldOrders: state.heldOrders.filter((h) => h.id !== id)
      }
    })
  },

  deleteHeldOrder: (id) =>
    set((state) => ({ heldOrders: state.heldOrders.filter((h) => h.id !== id) })),

  calcSummary: (taxRate, taxInclusive) => {
    const { items, appliedDiscounts } = get()
    const subtotal = items.reduce((acc, i) => acc + i.line_total, 0)
    const discountAmount = appliedDiscounts.reduce((acc, d) => acc + d.amount, 0)
    const afterDiscount = Math.max(0, subtotal - discountAmount)
    let taxAmount = 0
    if (taxInclusive) {
      taxAmount = afterDiscount - afterDiscount / (1 + taxRate / 100)
    } else {
      taxAmount = afterDiscount * (taxRate / 100)
    }
    const total = taxInclusive ? afterDiscount : afterDiscount + taxAmount
    return { subtotal, discountAmount, taxAmount, total }
  }
}))

// ── Auth / Session Store ───────────────────────────────────────────────────────
interface SessionState {
  currentEmployee: Employee | null
  currentShift: Shift | null
  isAuthenticated: boolean
  setEmployee: (emp: Employee | null) => void
  setShift: (shift: Shift | null) => void
  logout: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentEmployee: null,
  currentShift: null,
  isAuthenticated: false,
  setEmployee: (emp) => set({ currentEmployee: emp, isAuthenticated: !!emp }),
  setShift: (shift) => set({ currentShift: shift }),
  logout: () => set({ currentEmployee: null, currentShift: null, isAuthenticated: false })
}))

// ── App Settings Store ────────────────────────────────────────────────────────
interface SettingsState {
  settings: AppSettings | null
  loaded: boolean
  setSettings: (s: AppSettings) => void
  updateSetting: (key: keyof AppSettings, value: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loaded: false,
  setSettings: (s) => set({ settings: s, loaded: true }),
  updateSetting: (key, value) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, [key]: value } : null
    }))
}))
