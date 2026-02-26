import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useSessionStore } from '../store'
import { Toast } from './ui/Modal'
import { useToasts } from './ui/toast'
import {
  ShoppingCart,
  ChefHat,
  Package,
  BarChart3,
  Users,
  Tag,
  Settings,
  LogOut,
  Monitor,
  UtensilsCrossed,
  Menu
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'POS', icon: ShoppingCart },
  { path: '/orders', label: 'Orders', icon: UtensilsCrossed },
  { path: '/menu', label: 'Menu', icon: Menu },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/employees', label: 'Staff', icon: Users },
  { path: '/discounts', label: 'Discounts', icon: Tag },
  { path: '/settings', label: 'Settings', icon: Settings }
]

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentEmployee, logout } = useSessionStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { toasts, dismiss } = useToasts()

  const handleOpenKitchen = (): void => {
    window.api.window.openKitchen()
  }

  const handleOpenCustomer = (): void => {
    window.api.window.openCustomer()
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200 shrink-0',
          sidebarOpen ? 'w-52' : 'w-16'
        )}
      >
        {/* Logo/Toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <ChefHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">Restaurant POS</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="rounded-lg p-1.5 hover:bg-accent transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn('nav-item w-full', location.pathname === path && 'active')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Display windows */}
        <div className="border-t p-2 space-y-0.5">
          <button
            onClick={handleOpenKitchen}
            className="nav-item w-full text-xs"
            title="Open Kitchen Display"
          >
            <ChefHat className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="truncate">Kitchen Display</span>}
          </button>
          <button
            onClick={handleOpenCustomer}
            className="nav-item w-full text-xs"
            title="Open Customer Display"
          >
            <Monitor className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span className="truncate">Customer Display</span>}
          </button>
        </div>

        {/* Employee info + logout */}
        <div className="border-t p-3">
          {currentEmployee && (
            <div className={cn('flex items-center gap-2', !sidebarOpen && 'justify-center')}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {currentEmployee.name.slice(0, 2).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{currentEmployee.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{currentEmployee.role}</p>
                </div>
              )}
              <button
                onClick={logout}
                className="rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </div>
  )
}
