import { ElectronAPI } from '@electron-toolkit/preload'

type PosAPI = typeof import('./index')['api'] extends infer T ? T : never

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      settings: {
        getAll: () => Promise<Record<string, string>>
        set: (settings: Record<string, string>) => Promise<void>
        get: (key: string) => Promise<string | undefined>
      }
      categories: {
        getAll: () => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<void>
      }
      products: {
        getAll: (includeInactive?: boolean) => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        getByCategory: (categoryId: number) => Promise<unknown[]>
        search: (query: string) => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<void>
        getModifierGroups: (productId: number) => Promise<unknown[]>
      }
      modifierGroups: {
        getAll: () => Promise<unknown[]>
        create: (data: unknown, modifiers: unknown) => Promise<unknown>
        assignToProduct: (productId: number, groupId: number) => Promise<void>
        removeFromProduct: (productId: number, groupId: number) => Promise<void>
      }
      orders: {
        create: (data: unknown, items: unknown, payments: unknown, discounts: unknown) => Promise<unknown>
        getById: (id: number) => Promise<unknown>
        getActive: () => Promise<unknown[]>
        getPage: (page: number, pageSize: number, filter?: unknown) => Promise<{ rows: unknown[]; total: number }>
        getToday: () => Promise<unknown[]>
        updateStatus: (id: number, status: string) => Promise<unknown>
        updateItemStatus: (itemId: number, status: string) => Promise<void>
        void: (id: number, employeeId: number) => Promise<unknown>
        addPayment: (orderId: number, payment: unknown) => Promise<unknown>
      }
      inventory: {
        getAll: () => Promise<unknown[]>
        getLowStock: () => Promise<unknown[]>
        getValuation: () => Promise<{ total_value: number; items: unknown[] }>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<void>
        adjust: (itemId: number, delta: number, reason: string, empId?: number) => Promise<void>
        getHistory: (itemId: number) => Promise<unknown[]>
        getProductIngredients: (productId: number) => Promise<unknown[]>
        setProductIngredients: (productId: number, ingredients: unknown) => Promise<void>
      }
      employees: {
        getAll: (includeInactive?: boolean) => Promise<unknown[]>
        getById: (id: number) => Promise<unknown>
        verifyPin: (pin: string) => Promise<unknown>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<void>
      }
      shifts: {
        open: (employeeId: number, openingFloat: number) => Promise<unknown>
        close: (shiftId: number, closingCash: number, notes?: string) => Promise<unknown>
        getOpen: (employeeId: number) => Promise<unknown>
        getHistory: (limit?: number) => Promise<unknown[]>
      }
      discounts: {
        getAll: (includeInactive?: boolean) => Promise<unknown[]>
        getByCode: (code: string) => Promise<unknown>
        validate: (id: number, subtotal: number) => Promise<{ valid: boolean; reason?: string }>
        getAutoApplicable: (subtotal: number) => Promise<unknown[]>
        create: (data: unknown) => Promise<unknown>
        update: (id: number, data: unknown) => Promise<unknown>
        delete: (id: number) => Promise<void>
      }
      reports: {
        dashboard: () => Promise<unknown>
        salesByHour: (date: string) => Promise<unknown[]>
        salesByDay: (start: string, end: string) => Promise<unknown[]>
        salesByMonth: (year: number) => Promise<unknown[]>
        products: (start: string, end: string) => Promise<unknown[]>
        categories: (start: string, end: string) => Promise<unknown[]>
        payments: (start: string, end: string) => Promise<unknown[]>
        employees: (start: string, end: string) => Promise<unknown[]>
      }
      printer: {
        receipt: (data: unknown) => Promise<{ success: boolean; error?: string }>
        kitchen: (data: unknown) => Promise<{ success: boolean; error?: string }>
        test: () => Promise<{ success: boolean; error?: string }>
      }
      window: {
        openKitchen: () => Promise<boolean>
        openCustomer: () => Promise<boolean>
        closeKitchen: () => Promise<boolean>
        closeCustomer: () => Promise<boolean>
      }
      customer: {
        updateCart: (cartData: unknown) => Promise<boolean>
        showPayment: (paymentData: unknown) => Promise<boolean>
        clearDisplay: () => Promise<boolean>
      }
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
