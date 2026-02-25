import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// All POS API calls exposed to renderer
const api = {
  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (settings: Record<string, string>) => ipcRenderer.invoke('settings:set', settings),
    get: (key: string) => ipcRenderer.invoke('settings:get', key)
  },
  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (data: unknown) => ipcRenderer.invoke('categories:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },
  // Products
  products: {
    getAll: (includeInactive?: boolean) => ipcRenderer.invoke('products:getAll', includeInactive),
    getById: (id: number) => ipcRenderer.invoke('products:getById', id),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('products:getByCategory', categoryId),
    search: (query: string) => ipcRenderer.invoke('products:search', query),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    getModifierGroups: (productId: number) =>
      ipcRenderer.invoke('products:getModifierGroups', productId)
  },
  // Modifier groups
  modifierGroups: {
    getAll: () => ipcRenderer.invoke('modifierGroups:getAll'),
    create: (data: unknown, modifiers: unknown) =>
      ipcRenderer.invoke('modifierGroups:create', data, modifiers),
    assignToProduct: (productId: number, groupId: number) =>
      ipcRenderer.invoke('modifierGroups:assignToProduct', productId, groupId),
    removeFromProduct: (productId: number, groupId: number) =>
      ipcRenderer.invoke('modifierGroups:removeFromProduct', productId, groupId)
  },
  // Orders
  orders: {
    create: (data: unknown, items: unknown, payments: unknown, discounts: unknown) =>
      ipcRenderer.invoke('orders:create', data, items, payments, discounts),
    getById: (id: number) => ipcRenderer.invoke('orders:getById', id),
    getActive: () => ipcRenderer.invoke('orders:getActive'),
    getPage: (page: number, pageSize: number, filter?: unknown) =>
      ipcRenderer.invoke('orders:getPage', page, pageSize, filter),
    getToday: () => ipcRenderer.invoke('orders:getToday'),
    updateStatus: (id: number, status: string) =>
      ipcRenderer.invoke('orders:updateStatus', id, status),
    updateItemStatus: (itemId: number, status: string) =>
      ipcRenderer.invoke('orders:updateItemStatus', itemId, status),
    void: (id: number, employeeId: number) => ipcRenderer.invoke('orders:void', id, employeeId),
    addPayment: (orderId: number, payment: unknown) =>
      ipcRenderer.invoke('orders:addPayment', orderId, payment)
  },
  // Inventory
  inventory: {
    getAll: () => ipcRenderer.invoke('inventory:getAll'),
    getLowStock: () => ipcRenderer.invoke('inventory:getLowStock'),
    getValuation: () => ipcRenderer.invoke('inventory:getValuation'),
    create: (data: unknown) => ipcRenderer.invoke('inventory:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('inventory:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('inventory:delete', id),
    adjust: (itemId: number, delta: number, reason: string, empId?: number) =>
      ipcRenderer.invoke('inventory:adjust', itemId, delta, reason, empId),
    getHistory: (itemId: number) => ipcRenderer.invoke('inventory:getHistory', itemId),
    getProductIngredients: (productId: number) =>
      ipcRenderer.invoke('inventory:getProductIngredients', productId),
    setProductIngredients: (productId: number, ingredients: unknown) =>
      ipcRenderer.invoke('inventory:setProductIngredients', productId, ingredients)
  },
  // Employees
  employees: {
    getAll: (includeInactive?: boolean) =>
      ipcRenderer.invoke('employees:getAll', includeInactive),
    getById: (id: number) => ipcRenderer.invoke('employees:getById', id),
    verifyPin: (pin: string) => ipcRenderer.invoke('employees:verifyPin', pin),
    create: (data: unknown) => ipcRenderer.invoke('employees:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('employees:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('employees:delete', id)
  },
  // Shifts
  shifts: {
    open: (employeeId: number, openingFloat: number) =>
      ipcRenderer.invoke('shifts:open', employeeId, openingFloat),
    close: (shiftId: number, closingCash: number, notes?: string) =>
      ipcRenderer.invoke('shifts:close', shiftId, closingCash, notes),
    getOpen: (employeeId: number) => ipcRenderer.invoke('shifts:getOpen', employeeId),
    getHistory: (limit?: number) => ipcRenderer.invoke('shifts:getHistory', limit)
  },
  // Discounts
  discounts: {
    getAll: (includeInactive?: boolean) =>
      ipcRenderer.invoke('discounts:getAll', includeInactive),
    getByCode: (code: string) => ipcRenderer.invoke('discounts:getByCode', code),
    validate: (id: number, subtotal: number) =>
      ipcRenderer.invoke('discounts:validate', id, subtotal),
    getAutoApplicable: (subtotal: number) =>
      ipcRenderer.invoke('discounts:getAutoApplicable', subtotal),
    create: (data: unknown) => ipcRenderer.invoke('discounts:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('discounts:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('discounts:delete', id)
  },
  // Reports
  reports: {
    dashboard: () => ipcRenderer.invoke('reports:dashboard'),
    salesByHour: (date: string) => ipcRenderer.invoke('reports:salesByHour', date),
    salesByDay: (start: string, end: string) =>
      ipcRenderer.invoke('reports:salesByDay', start, end),
    salesByMonth: (year: number) => ipcRenderer.invoke('reports:salesByMonth', year),
    products: (start: string, end: string) => ipcRenderer.invoke('reports:products', start, end),
    categories: (start: string, end: string) =>
      ipcRenderer.invoke('reports:categories', start, end),
    payments: (start: string, end: string) =>
      ipcRenderer.invoke('reports:payments', start, end),
    employees: (start: string, end: string) =>
      ipcRenderer.invoke('reports:employees', start, end)
  },
  // Printer
  printer: {
    receipt: (data: unknown) => ipcRenderer.invoke('printer:receipt', data),
    kitchen: (data: unknown) => ipcRenderer.invoke('printer:kitchen', data),
    test: () => ipcRenderer.invoke('printer:test')
  },
  // Windows
  window: {
    openKitchen: () => ipcRenderer.invoke('window:openKitchen'),
    openCustomer: () => ipcRenderer.invoke('window:openCustomer'),
    closeKitchen: () => ipcRenderer.invoke('window:closeKitchen'),
    closeCustomer: () => ipcRenderer.invoke('window:closeCustomer')
  },
  // Customer display
  customer: {
    updateCart: (cartData: unknown) => ipcRenderer.invoke('customer:updateCart', cartData),
    showPayment: (paymentData: unknown) =>
      ipcRenderer.invoke('customer:showPayment', paymentData),
    clearDisplay: () => ipcRenderer.invoke('customer:clearDisplay')
  },
  // Event listeners (push events from main)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      'kitchen:newOrder',
      'kitchen:orderUpdated',
      'display:updateCart',
      'display:showPayment',
      'display:clear'
    ]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
