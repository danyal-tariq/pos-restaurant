import { ipcMain, BrowserWindow } from 'electron'
import * as productsRepo from '../db/repositories/products'
import * as ordersRepo from '../db/repositories/orders'
import * as inventoryRepo from '../db/repositories/inventory'
import * as employeesRepo from '../db/repositories/employees'
import * as settingsRepo from '../db/repositories/settings'
import * as discountsRepo from '../db/repositories/discounts'
import * as reportsRepo from '../db/repositories/reports'

export function registerDbIpcHandlers(): void {
  // ── Settings ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:getAll', () => settingsRepo.getAllSettings())
  ipcMain.handle('settings:set', (_e, settings: Record<string, string>) =>
    settingsRepo.setSettings(settings)
  )
  ipcMain.handle('settings:get', (_e, key: string) => settingsRepo.getSetting(key))

  // ── Categories ────────────────────────────────────────────────────────
  ipcMain.handle('categories:getAll', () => productsRepo.getCategories())
  ipcMain.handle('categories:create', (_e, data) => productsRepo.createCategory(data))
  ipcMain.handle('categories:update', (_e, id: number, data) =>
    productsRepo.updateCategory(id, data)
  )
  ipcMain.handle('categories:delete', (_e, id: number) => productsRepo.deleteCategory(id))

  // ── Products ──────────────────────────────────────────────────────────
  ipcMain.handle('products:getAll', (_e, includeInactive?: boolean) =>
    productsRepo.getProducts(includeInactive)
  )
  ipcMain.handle('products:getById', (_e, id: number) => productsRepo.getProductById(id))
  ipcMain.handle('products:getByCategory', (_e, categoryId: number) =>
    productsRepo.getProductsByCategoryId(categoryId)
  )
  ipcMain.handle('products:search', (_e, query: string) => productsRepo.searchProducts(query))
  ipcMain.handle('products:create', (_e, data) => productsRepo.createProduct(data))
  ipcMain.handle('products:update', (_e, id: number, data) => productsRepo.updateProduct(id, data))
  ipcMain.handle('products:delete', (_e, id: number) => productsRepo.deleteProduct(id))
  ipcMain.handle('products:getModifierGroups', (_e, productId: number) =>
    productsRepo.getModifierGroupsForProduct(productId)
  )

  // ── Modifier Groups ───────────────────────────────────────────────────
  ipcMain.handle('modifierGroups:getAll', () => productsRepo.getAllModifierGroups())
  ipcMain.handle('modifierGroups:create', (_e, data, modifiers) =>
    productsRepo.createModifierGroup(data, modifiers)
  )
  ipcMain.handle('modifierGroups:assignToProduct', (_e, productId: number, groupId: number) =>
    productsRepo.assignModifierGroupToProduct(productId, groupId)
  )
  ipcMain.handle('modifierGroups:removeFromProduct', (_e, productId: number, groupId: number) =>
    productsRepo.removeModifierGroupFromProduct(productId, groupId)
  )

  // ── Orders ────────────────────────────────────────────────────────────
  ipcMain.handle('orders:create', (_e, data, items, payments, discounts) => {
    const order = ordersRepo.createOrder(data, items, payments, discounts)
    // Notify kitchen display
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      win.webContents.send('kitchen:newOrder', order)
    }
    return order
  })
  ipcMain.handle('orders:getById', (_e, id: number) => ordersRepo.getOrderById(id))
  ipcMain.handle('orders:getActive', () => ordersRepo.getActiveOrders())
  ipcMain.handle('orders:getPage', (_e, page: number, pageSize: number, filter?) =>
    ordersRepo.getOrdersPage(page, pageSize, filter)
  )
  ipcMain.handle('orders:getToday', () => ordersRepo.getTodaysOrders())
  ipcMain.handle('orders:updateStatus', (_e, id: number, status: string) => {
    ordersRepo.updateOrderStatus(id, status as ordersRepo.Order['status'])
    const order = ordersRepo.getOrderById(id)
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      win.webContents.send('kitchen:orderUpdated', order)
    }
    return order
  })
  ipcMain.handle('orders:updateItemStatus', (_e, itemId: number, status: string) => {
    ordersRepo.updateOrderItemStatus(itemId, status)
  })
  ipcMain.handle('orders:void', (_e, id: number, employeeId: number) => {
    ordersRepo.voidOrder(id, employeeId)
    return ordersRepo.getOrderById(id)
  })
  ipcMain.handle('orders:addPayment', (_e, orderId: number, payment) => {
    const order = ordersRepo.addPaymentToOrder(orderId, payment)
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      win.webContents.send('kitchen:orderUpdated', order)
    }
    return order
  })

  // ── Inventory ─────────────────────────────────────────────────────────
  ipcMain.handle('inventory:getAll', () => inventoryRepo.getAllInventoryItems())
  ipcMain.handle('inventory:getLowStock', () => inventoryRepo.getLowStockItems())
  ipcMain.handle('inventory:getValuation', () => inventoryRepo.getInventoryValuation())
  ipcMain.handle('inventory:create', (_e, data) => inventoryRepo.createInventoryItem(data))
  ipcMain.handle('inventory:update', (_e, id: number, data) =>
    inventoryRepo.updateInventoryItem(id, data)
  )
  ipcMain.handle('inventory:delete', (_e, id: number) => inventoryRepo.deleteInventoryItem(id))
  ipcMain.handle(
    'inventory:adjust',
    (_e, itemId: number, delta: number, reason: string, empId?: number) =>
      inventoryRepo.adjustInventory(itemId, delta, reason, empId)
  )
  ipcMain.handle('inventory:getHistory', (_e, itemId: number) =>
    inventoryRepo.getAdjustmentHistory(itemId)
  )
  ipcMain.handle('inventory:getProductIngredients', (_e, productId: number) =>
    inventoryRepo.getProductIngredients(productId)
  )
  ipcMain.handle('inventory:setProductIngredients', (_e, productId: number, ingredients) =>
    inventoryRepo.setProductIngredients(productId, ingredients)
  )

  // ── Employees ─────────────────────────────────────────────────────────
  ipcMain.handle('employees:getAll', (_e, includeInactive?: boolean) =>
    employeesRepo.getAllEmployees(includeInactive)
  )
  ipcMain.handle('employees:getById', (_e, id: number) => employeesRepo.getEmployeeById(id))
  ipcMain.handle('employees:verifyPin', (_e, pin: string) => employeesRepo.getEmployeeByPin(pin))
  ipcMain.handle('employees:create', (_e, data) => employeesRepo.createEmployee(data))
  ipcMain.handle('employees:update', (_e, id: number, data) =>
    employeesRepo.updateEmployee(id, data)
  )
  ipcMain.handle('employees:delete', (_e, id: number) => employeesRepo.deleteEmployee(id))

  // ── Shifts ────────────────────────────────────────────────────────────
  ipcMain.handle('shifts:open', (_e, employeeId: number, openingFloat: number) =>
    employeesRepo.openShift(employeeId, openingFloat)
  )
  ipcMain.handle('shifts:close', (_e, shiftId: number, closingCash: number, notes?: string) =>
    employeesRepo.closeShift(shiftId, closingCash, notes)
  )
  ipcMain.handle('shifts:getOpen', (_e, employeeId: number) =>
    employeesRepo.getOpenShift(employeeId)
  )
  ipcMain.handle('shifts:getHistory', (_e, limit?: number) => employeesRepo.getShiftsHistory(limit))

  // ── Discounts ─────────────────────────────────────────────────────────
  // Normalize: DB uses `active` int + days_of_week CSV string
  //            Renderer uses `is_active` bool + days_of_week number[]
  function normalizeDiscount(d: discountsRepo.Discount | undefined): unknown {
    if (!d) return null
    return {
      ...d,
      is_active: Boolean(d.active),
      days_of_week: d.days_of_week ? d.days_of_week.split(',').map(Number) : null
    }
  }
  function denormalizeDiscount(data: Record<string, unknown>): Record<string, unknown> {
    const out = { ...data }
    if ('is_active' in data) {
      out.active = data.is_active ? 1 : 0
      delete out.is_active
    }
    if (Array.isArray(data.days_of_week)) out.days_of_week = data.days_of_week.join(',')
    else if (data.days_of_week === null || data.days_of_week === undefined) out.days_of_week = null
    if (out.max_uses === undefined) out.max_uses = 0
    return out
  }

  ipcMain.handle('discounts:getAll', (_e, includeInactive?: boolean) =>
    discountsRepo.getAllDiscounts(includeInactive).map(normalizeDiscount)
  )
  ipcMain.handle('discounts:getByCode', (_e, code: string) =>
    normalizeDiscount(discountsRepo.getDiscountByCode(code))
  )
  ipcMain.handle('discounts:validate', (_e, id: number, subtotal: number) =>
    discountsRepo.validateDiscount(id, subtotal)
  )
  ipcMain.handle('discounts:getAutoApplicable', (_e, subtotal: number) =>
    discountsRepo.getAutoApplicableDiscounts(subtotal).map(normalizeDiscount)
  )
  ipcMain.handle('discounts:create', (_e, data) =>
    normalizeDiscount(discountsRepo.createDiscount(denormalizeDiscount(data) as any))
  )
  ipcMain.handle('discounts:update', (_e, id: number, data) =>
    normalizeDiscount(discountsRepo.updateDiscount(id, denormalizeDiscount(data) as any))
  )
  ipcMain.handle('discounts:delete', (_e, id: number) => discountsRepo.deleteDiscount(id))

  // ── Reports ───────────────────────────────────────────────────────────
  ipcMain.handle('reports:dashboard', () => reportsRepo.getDashboardStats())
  ipcMain.handle('reports:salesByHour', (_e, date: string) => reportsRepo.getSalesByHour(date))
  ipcMain.handle('reports:salesByDay', (_e, start: string, end: string) =>
    reportsRepo.getSalesByDay(start, end)
  )
  ipcMain.handle('reports:salesByMonth', (_e, year: number) => reportsRepo.getSalesByMonth(year))
  ipcMain.handle('reports:products', (_e, start: string, end: string) =>
    reportsRepo.getProductSalesReport(start, end)
  )
  ipcMain.handle('reports:categories', (_e, start: string, end: string) =>
    reportsRepo.getCategorySalesReport(start, end)
  )
  ipcMain.handle('reports:payments', (_e, start: string, end: string) =>
    reportsRepo.getPaymentSummary(start, end)
  )
  ipcMain.handle('reports:employees', (_e, start: string, end: string) =>
    reportsRepo.getEmployeeSalesReport(start, end)
  )
}
