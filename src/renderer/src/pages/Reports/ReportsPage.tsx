import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useCurrency } from '../../hooks/useSettings'
import { Card, Badge, Spinner } from '../../components/ui/index'
import { TrendingUp, ShoppingCart, DollarSign, Package, Users, Calendar } from 'lucide-react'
import type { DashboardStats, SalesDataPoint } from '../../types'

type Period = 'today' | 'week' | 'month'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  trend?: string
  color?: string
}
function StatCard({ label, value, icon, trend, color = 'bg-primary/10 text-primary' }: StatCardProps): JSX.Element {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
    </Card>
  )
}

export function ReportsPage(): JSX.Element {
  const fmt = useCurrency()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [period, setPeriod] = useState<Period>('today')
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([])
  const [productData, setProductData] = useState<{ product_name: string; qty: number; revenue: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ category_name: string; orders: number; revenue: number }[]>([])
  const [paymentData, setPaymentData] = useState<{ method: string; count: number; total_amount: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async (): Promise<void> => {
      const today = new Date().toISOString().slice(0, 10)
      const monthStart = today.slice(0, 7) + '-01'
      const [s, pd, cd, pay] = await Promise.all([
        window.api.reports.dashboard() as Promise<DashboardStats>,
        window.api.reports.products(monthStart, today) as Promise<typeof productData>,
        window.api.reports.categories(monthStart, today) as Promise<typeof categoryData>,
        window.api.reports.payments(monthStart, today) as Promise<typeof paymentData>
      ])
      setStats(s)
      setProductData(pd)
      setCategoryData(cd)
      setPaymentData(pay)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const loadSales = async (): Promise<void> => {
      let data: SalesDataPoint[] = []
      const today = new Date().toISOString().slice(0, 10)
      const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
      const yearStart = today.slice(0, 4) + '-01-01'
      if (period === 'today') data = await window.api.reports.salesByHour(today) as SalesDataPoint[]
      else if (period === 'week') data = await window.api.reports.salesByDay(weekStart, today) as SalesDataPoint[]
      else data = await window.api.reports.salesByMonth(new Date().getFullYear()) as SalesDataPoint[]
      setSalesData(data)
    }
    loadSales()
  }, [period])

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner className="h-10 w-10" /></div>

  return (
    <div className="flex flex-col h-full overflow-auto p-6 gap-6">
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Today's Revenue"
            value={fmt(stats.today_revenue)}
            icon={<DollarSign className="h-5 w-5" />}
            color="bg-green-100 text-green-700"
          />
          <StatCard
            label="Today's Orders"
            value={String(stats.today_orders)}
            icon={<ShoppingCart className="h-5 w-5" />}
            color="bg-blue-100 text-blue-700"
          />
          <StatCard
            label="Avg. Order Value"
            value={fmt(stats.avg_order_value)}
            icon={<TrendingUp className="h-5 w-5" />}
            color="bg-purple-100 text-purple-700"
          />
          <StatCard
            label="Pending Orders"
            value={String(stats.pending_orders)}
            icon={<Package className="h-5 w-5" />}
            color="bg-orange-100 text-orange-700"
          />
        </div>
      )}

      {/* Sales Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">Sales Overview</h2>
          <div className="flex gap-1">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors capitalize
                  ${period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                {p === 'today' ? 'By Hour' : p === 'week' ? 'Last 7 Days' : 'By Month'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={salesData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom row: Products + Categories + Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <Card className="p-5">
          <h2 className="font-bold text-base mb-3">Top Products</h2>
          <div className="space-y-2">
            {productData.slice(0, 8).map((p) => (
              <div key={p.product_name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.product_name}</p>
                  <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Categories */}
        <Card className="p-5">
          <h2 className="font-bold text-base mb-3">By Category</h2>
          <div className="space-y-2">
            {categoryData.slice(0, 8).map((c) => (
              <div key={c.category_name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.category_name}</p>
                  <p className="text-xs text-muted-foreground">{c.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(c.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Payments */}
        <Card className="p-5">
          <h2 className="font-bold text-base mb-3">Payment Methods</h2>
          <div className="space-y-2">
            {paymentData.map((p) => (
              <div key={p.method} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{p.method}</p>
                  <p className="text-xs text-muted-foreground">{p.count} transactions</p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(p.total_amount)}</span>
              </div>
            ))}
          </div>
          {paymentData.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>}
        </Card>
      </div>

      {/* Top products from dashboard */}
      {stats?.top_products && stats.top_products.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-base mb-3">Today's Best Sellers</h2>
          <div className="flex flex-wrap gap-2">
            {stats.top_products.map((p, i) => (
              <div key={p.product_name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground font-bold">#{i + 1}</span>
                <span className="text-sm font-medium">{p.product_name}</span>
                <Badge variant="secondary">{p.qty} sold</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
