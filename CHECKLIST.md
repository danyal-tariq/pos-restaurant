# POS System — Implementation Checklist

## Project Setup
- [x] Electron + React + TypeScript scaffold (electron-vite)
- [x] SQLite database (better-sqlite3, WAL mode)
- [x] TailwindCSS v3 + PostCSS configuration
- [x] Zustand state management
- [x] React Router (HashRouter for Electron file:// protocol)
- [x] lucide-react icons
- [x] recharts for analytics
- [x] class-variance-authority for component variants
- [x] TypeScript strict mode — zero errors
- [x] `npm run typecheck` passes clean

---

## Database Layer (`src/main/db/`)
- [x] `database.ts` — SQLite init, WAL mode, migrations
- [x] `repositories/settings.ts` — key-value settings store
- [x] `repositories/categories.ts` — menu categories (name, color, icon, sort order)
- [x] `repositories/products.ts` — menu items with modifiers, inventory tracking
- [x] `repositories/modifiers.ts` — modifier groups & options (required, multi-select)
- [x] `repositories/orders.ts` — orders, order items, order status, void, pagination + search
- [x] `repositories/inventory.ts` — stock items, adjustments log, product ingredients, valuation
- [x] `repositories/employees.ts` — staff, PIN auth, roles (admin/manager/cashier)
- [x] `repositories/shifts.ts` — shift open/close, history
- [x] `repositories/discounts.ts` — percentage/fixed discounts, coupon codes, day/time rules
- [x] `repositories/reports.ts` — dashboard stats, sales by hour/day/month, product/category/payment breakdowns

---

## IPC / Preload Bridge
- [x] `src/main/ipc/db.ipc.ts` — all IPC handlers registered
  - [x] Settings CRUD
  - [x] Categories CRUD
  - [x] Products CRUD + modifiers
  - [x] Modifier groups CRUD
  - [x] Orders — create, getById, getActive, getPage, getToday, updateStatus, updateItemStatus, void
  - [x] Inventory — getAll, getLowStock, getValuation, CRUD, adjust, history, product ingredients
  - [x] Employees — getAll, getById, verifyPin, CRUD
  - [x] Shifts — open, close, getOpen, getHistory
  - [x] Discounts — getAll, getByCode, validate, getAutoApplicable, CRUD (with normalize/denormalize)
  - [x] Reports — dashboard, salesByHour, salesByDay, salesByMonth, products, categories, payments, employees
- [x] `src/main/ipc/printer.ipc.ts` — receipt, kitchen ticket, test print
- [x] `src/preload/index.ts` — full contextBridge API surface
- [x] `src/preload/index.d.ts` — TypeScript declarations for `window.api`

---

## Main Process (`src/main/index.ts`)
- [x] Main POS window (full-screen, frame, tray-aware)
- [x] Kitchen Display window (secondary monitor, dark mode intent)
- [x] Customer Display window (tertiary monitor, frameless)
- [x] System tray with context menu (show POS, open displays, quit)
- [x] Multi-window IPC — push events to kitchen & customer windows
- [x] Window management IPC (open/close kitchen & customer windows)

---

## Renderer — Stores & Utilities
- [x] `store/cartStore.ts` — cart items, held orders, applied discounts, calcSummary
- [x] `store/sessionStore.ts` — authenticated employee, shift, PIN login/logout
- [x] `store/settingsStore.ts` — app settings cache
- [x] `lib/utils.ts` — `cn`, formatCurrency, formatDate, formatDateTime, formatTime, statusColor, orderTypeLabel
- [x] `hooks/useSettings.ts` — settings loader + currency formatter
- [x] `hooks/useTaxRate.ts` — tax rate & inclusive flag from settings
- [x] `types/index.ts` — all shared domain types (Category, Product, Order, Employee, Shift, Discount, InventoryItem, etc.)

---

## UI Components
- [x] `components/ui/index.tsx` — Button, Badge, Card, Input, Label, Textarea, Spinner, EmptyState
- [x] `components/ui/Modal.tsx` — Modal, ConfirmDialog, PinInput, Select, Toast / showToast
- [x] `components/Layout.tsx` — sidebar nav, shift status bar, page links

---

## Pages
- [x] `pages/Login.tsx` — PIN entry, employee select, shift open with opening float
- [x] `pages/POS/POSPage.tsx` — full POS screen: category filter, product grid, cart, order type, table number, held orders, notes
- [x] `pages/POS/ModifierModal.tsx` — modifier group selector with required/multi-select logic
- [x] `pages/POS/PaymentModal.tsx` — cash/card/split payment, change calculation, coupon code, order creation, receipt print, customer display update
- [x] `pages/Kitchen/KitchenPage.tsx` — real-time ticket grid, item status toggle, bump-to-complete, urgency coloring, auto-poll + IPC events
- [x] `pages/CustomerDisplay/CustomerDisplayPage.tsx` — idle / cart / payment / thank-you modes, IPC-driven
- [x] `pages/Orders/OrdersPage.tsx` — paginated order history, search, status filter, detail modal, void, reprint
- [x] `pages/Menu/MenuPage.tsx` — category management (create/edit/delete, color dots), product grid (create/edit/delete, active toggle, stock badge)
- [x] `pages/Inventory/InventoryPage.tsx` — stock list, low-stock alerts, adjust modal (add/remove/set), valuation summary, item CRUD
- [x] `pages/Reports/ReportsPage.tsx` — KPI cards, bar chart (hourly/daily/monthly), top products table, categories breakdown, payment methods summary
- [x] `pages/Employees/EmployeesPage.tsx` — staff cards (role badge, status), employee CRUD with PIN + hourly rate, shift history table
- [x] `pages/Discounts/DiscountsPage.tsx` — discount list, create/edit with type, value, code, min-order, max-uses, time range, day-of-week, active toggle
- [x] `pages/Settings/SettingsPage.tsx` — shop info, tax/currency, printer config (with test print), theme (dark/light/system)
- [x] `App.tsx` — HashRouter, auth guard, lazy-loaded pages, kitchen & customer display bypass routes

---

## Bug Fixes Applied
- [x] `orders.getOrdersPage` returns `{ rows, total }` (was `orders`) + `search` filter support
- [x] Discounts IPC normalize/denormalize (`active` int ↔ `is_active` bool, CSV ↔ `number[]`)
- [x] `voidOrder` unused parameter renamed to `_employeeId`
- [x] Tailwind v4 → downgraded to v3.4 (compatible with `tailwind.config.js` + `@tailwind` directives)
- [x] PostCSS config corrected for Tailwind v3
- [x] `JSX` global namespace re-declared in `env.d.ts` for React 19 compatibility
- [x] `components/ui/index.tsx` import path fixed (`../../lib/utils`)
- [x] `Login` export alias fixed in `App.tsx`
- [x] `EmptyState` action prop changed from object literal to ReactNode at all call sites
- [x] `ConfirmDialog` `variant="destructive"` → `destructive` prop at all call sites
- [x] `OrderDetail` interface uses `Omit<Order, 'items' | 'payments'>` to allow narrower payment type
- [x] `PaymentModal` payments array explicitly typed
- [x] `CustomerDisplayPage` event handler signatures fixed (preload strips `_event`)
- [x] `Product`/`Employee`/`Shift` types extended with optional alias fields
- [x] `InventoryPage` valuation type corrected (`items[]` not `item_count`)
- [x] `MenuPage` `track_inventory` stored as `0/1` integer; `is_active` resolved from both `active` and `is_active` fields
- [x] `ReportsPage` recharts Tooltip formatter typed as `(v: number | undefined) => string`

---

## Pending / Future Enhancements
- [ ] electron-builder packaging config (`electron-builder.yml`)
- [ ] Modifier group assignment UI in MenuPage
- [ ] Product ingredients tab in InventoryPage (link products to stock items)
- [ ] Employee reports tab in ReportsPage
- [ ] Shift close modal on logout (in Layout.tsx)
- [ ] Auto-apply eligible discounts on POS (call `discounts.getAutoApplicable()`)
- [ ] Barcode scanner input support on POS product search
- [ ] Receipt template customisation in Settings
- [ ] Database backup / export feature
- [ ] Auto-updater integration (electron-updater already installed)
