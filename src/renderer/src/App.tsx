import React, { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui/index'
import { useSessionStore } from './store'
import { LoginPage as Login } from './pages/Login'

const POSPage = lazy(() => import('./pages/POS/POSPage').then((m) => ({ default: m.POSPage })))
const OrdersPage = lazy(() => import('./pages/Orders/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const MenuPage = lazy(() => import('./pages/Menu/MenuPage').then((m) => ({ default: m.MenuPage })))
const InventoryPage = lazy(() => import('./pages/Inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const EmployeesPage = lazy(() => import('./pages/Employees/EmployeesPage').then((m) => ({ default: m.EmployeesPage })))
const DiscountsPage = lazy(() => import('./pages/Discounts/DiscountsPage').then((m) => ({ default: m.DiscountsPage })))
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const KitchenPage = lazy(() => import('./pages/Kitchen/KitchenPage').then((m) => ({ default: m.KitchenPage })))
const CustomerDisplayPage = lazy(() =>
  import('./pages/CustomerDisplay/CustomerDisplayPage').then((m) => ({ default: m.CustomerDisplayPage }))
)

function PageLoader(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

function AuthenticatedApp(): JSX.Element {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/discounts" element={<DiscountsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

function App(): React.JSX.Element {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)

  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/customer-display" element={<CustomerDisplayPage />} />
          <Route
            path="*"
            element={isAuthenticated ? <AuthenticatedApp /> : <Login />}
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
