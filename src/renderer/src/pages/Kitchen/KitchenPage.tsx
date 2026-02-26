import { useState, useEffect, useCallback } from 'react'
import { cn, formatTime, elapsedMinutes, formatElapsed } from '../../lib/utils'
import { Badge } from '../../components/ui/index'
import { ChefHat, Clock, CheckCircle2, RefreshCw } from 'lucide-react'

interface KitchenOrder {
  id: number
  order_number: string
  order_type: string
  table_number?: string | null
  customer_name?: string | null
  created_at: string
  status: string
  notes?: string | null
  items: KitchenItem[]
}

interface KitchenItem {
  id: number
  product_name: string
  quantity: number
  modifiers_json?: string | null
  notes?: string | null
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  preparing: 'bg-blue-500',
  ready: 'bg-green-500',
  completed: 'bg-gray-400'
}

function TicketCard({
  order,
  onBump,
  onItemToggle
}: {
  order: KitchenOrder
  onBump: (id: number) => void
  onItemToggle: (orderId: number, itemId: number, status: string) => void
}): JSX.Element {
  const mins = elapsedMinutes(order.created_at)
  const urgentClass =
    mins >= 15
      ? 'border-red-500 shadow-red-900'
      : mins >= 8
        ? 'border-orange-400 shadow-orange-900'
        : 'border-gray-600'

  const modifiers = (item: KitchenItem): string[] => {
    if (!item.modifiers_json) return []
    try {
      return (JSON.parse(item.modifiers_json) as { name: string }[]).map((m) => m.name)
    } catch {
      return []
    }
  }

  return (
    <div
      className={cn(
        'ticket-card rounded-xl border-2 bg-gray-800 shadow-md flex flex-col',
        urgentClass
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-700/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">{order.order_number}</span>
          <Badge
            variant={
              order.order_type === 'dine_in'
                ? 'default'
                : order.order_type === 'takeaway'
                  ? 'secondary'
                  : 'warning'
            }
          >
            {order.order_type === 'dine_in'
              ? `Table ${order.table_number ?? '-'}`
              : order.order_type === 'takeaway'
                ? 'Takeaway'
                : 'Delivery'}
          </Badge>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white',
            mins >= 15 ? 'bg-red-500' : mins >= 8 ? 'bg-orange-400' : 'bg-gray-400'
          )}
        >
          <Clock className="h-3 w-3" />
          {formatElapsed(order.created_at)}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-2">
        {order.items
          .filter((i) => i.status !== 'served')
          .map((item) => (
            <button
              key={item.id}
              onClick={() => onItemToggle(order.id, item.id, item.status)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2 transition-colors',
                item.status === 'preparing'
                  ? 'bg-blue-900/40 border border-blue-500'
                  : 'hover:bg-gray-700/50 border border-transparent'
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'mt-0.5 h-4 w-4 rounded-full flex-shrink-0',
                    STATUS_COLORS[item.status] ?? 'bg-gray-300'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-base">{item.quantity}×</span>
                    <span className="font-semibold">{item.product_name}</span>
                  </div>
                  {modifiers(item).length > 0 && (
                    <p className="text-xs text-gray-300 ml-5">{modifiers(item).join(', ')}</p>
                  )}
                  {item.notes && (
                    <p className="text-xs italic text-orange-400 ml-5">* {item.notes}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        {order.notes && <p className="text-xs italic text-gray-400 px-1">Note: {order.notes}</p>}
      </div>

      {/* Bump button */}
      <div className="p-2 border-t">
        <button
          onClick={() => onBump(order.id)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 text-white py-2 font-semibold transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          BUMP
        </button>
      </div>
    </div>
  )
}

export function KitchenPage(): JSX.Element {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadOrders = useCallback(async () => {
    const result = (await window.api.orders.getToday()) as KitchenOrder[]
    // Show only pending & preparing orders sort oldest first
    const active = result
      .filter((o) => ['pending', 'preparing'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    setOrders(active)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadOrders()
    const interval = setInterval(loadOrders, 30000)
    // Listen for real-time updates
    const handler = (): void => {
      loadOrders()
    }
    window.api.on('kitchen:newOrder', handler)
    window.api.on('kitchen:orderUpdated', handler)
    return () => {
      clearInterval(interval)
      window.api.off('kitchen:newOrder', handler)
      window.api.off('kitchen:orderUpdated', handler)
    }
  }, [loadOrders])

  const handleBump = async (orderId: number): Promise<void> => {
    await window.api.orders.updateStatus(orderId, 'completed')
    await loadOrders()
  }

  const handleItemToggle = async (
    orderId: number,
    itemId: number,
    currentStatus: string
  ): Promise<void> => {
    const nextStatus =
      currentStatus === 'pending'
        ? 'preparing'
        : currentStatus === 'preparing'
          ? 'served'
          : 'pending'
    await window.api.orders.updateItemStatus(itemId, nextStatus)
    const mapped = orders.map((o) =>
      o.id !== orderId
        ? o
        : { ...o, items: o.items.map((i) => (i.id !== itemId ? i : { ...i, status: nextStatus })) }
    )
    setOrders(mapped)
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-orange-400" />
          <h1 className="text-xl font-bold">Kitchen Display</h1>
          <span className="bg-orange-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
            {orders.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>Last refresh: {formatTime(lastRefresh.toISOString())}</span>
          <button
            onClick={loadOrders}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tickets grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
            <ChefHat className="h-16 w-16" />
            <p className="text-xl font-medium">No active orders</p>
            <p className="text-sm">New orders will appear here automatically</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {orders.map((order) => (
              <TicketCard
                key={order.id}
                order={order}
                onBump={handleBump}
                onItemToggle={handleItemToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-6 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-full', c)} />
            {s}
          </span>
        ))}
        <span className="ml-auto">Click item to toggle status • Click BUMP to complete order</span>
      </div>
    </div>
  )
}
