import React, { useState, useEffect, useCallback } from 'react'
import { formatDateTime, statusColor, orderTypeLabel } from '../../lib/utils'
import { useCurrency } from '../../hooks/useSettings'
import { Badge, Button, Input, Spinner, EmptyState, Card, Label } from '../../components/ui/index'
import { Modal, ConfirmDialog, showToast } from '../../components/ui/Modal'
import { Search, Eye, Ban, Printer, ChevronLeft, ChevronRight, CreditCard, Banknote } from 'lucide-react'
import type { Order } from '../../types'

const PAGE_SIZE = 20

interface OrderDetailItem {
  product_name: string
  quantity: number
  unit_price: number
  modifiers_price: number
  line_total: number
  modifiers_json?: string | null
  notes?: string | null
}

interface OrderDetail extends Omit<Order, 'items' | 'payments'> {
  items: OrderDetailItem[]
  payments: { method: string; amount: number; tendered?: number; change_given?: number }[]
}

export function OrdersPage(): JSX.Element {
  const fmt = useCurrency()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OrderDetail | null>(null)
  const [voidTarget, setVoidTarget] = useState<Order | null>(null)
  const [payTarget, setPayTarget] = useState<Order | null>(null)
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash')
  const [payTendered, setPayTendered] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { rows, total: t } = await window.api.orders.getPage(page, PAGE_SIZE, {
      search: search || undefined,
      status: statusFilter || undefined
    }) as { rows: Order[]; total: number }
    setOrders(rows)
    setTotal(t)
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleView = async (order: Order): Promise<void> => {
    const detail = await window.api.orders.getById(order.id) as OrderDetail
    setSelected(detail)
  }

  const handleVoid = async (order: Order): Promise<void> => {
    await window.api.orders.void(order.id, 0)
    setVoidTarget(null)
    load()
  }

  const handleCollectPayment = async (): Promise<void> => {
    if (!payTarget) return
    const tendered = parseFloat(payTendered) || payTarget.total
    const change = Math.max(0, tendered - payTarget.total)
    const payment = payMethod === 'cash'
      ? { method: 'cash' as const, amount: payTarget.total, tendered, change_given: change }
      : { method: 'card' as const, amount: payTarget.total }
    await window.api.orders.addPayment(payTarget.id, payment)
    showToast(`Payment collected for order ${payTarget.order_number}`, 'success')
    setPayTarget(null)
    setPayTendered('')
    load()
  }

  const handleReprint = async (order: Order): Promise<void> => {
    await window.api.printer.receipt({
      shopName: '',
      orderNumber: order.order_number,
      orderType: order.order_type,
      tableNumber: order.table_number ?? undefined,
      customerName: order.customer_name ?? undefined,
      items: [],
      subtotal: order.subtotal,
      discountAmount: order.discount_amount,
      taxAmount: order.tax_amount,
      total: order.total,
      paymentMethod: 'reprint',
      createdAt: formatDateTime(order.created_at)
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search order number or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All statuses</option>
          {['pending', 'preparing', 'ready', 'completed', 'voided'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Spinner className="h-8 w-8" /></div>
          ) : orders.length === 0 ? (
            <EmptyState title="No orders found" description="Try adjusting your filters" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {['Order #', 'Time', 'Type', 'Customer', 'Items', 'Total', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold">{order.order_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{orderTypeLabel(order.order_type)}</Badge></td>
                    <td className="px-4 py-3">{order.customer_name ?? (order.table_number ? `Table ${order.table_number}` : '—')}</td>
                    <td className="px-4 py-3">{(order as any).item_count ?? 0}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(order.total)}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusColor(order.status)} variant="outline">{order.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleView(order)} className="p-1.5 rounded hover:bg-accent" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleReprint(order)} className="p-1.5 rounded hover:bg-accent" title="Reprint">
                          <Printer className="h-4 w-4" />
                        </button>
                        {['pending', 'preparing', 'ready'].includes(order.status) && (
                          <button
                            onClick={() => { setPayTarget(order); setPayMethod('cash'); setPayTendered('') }}
                            className="p-1.5 rounded hover:bg-green-100 text-green-700"
                            title="Collect Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        {order.status !== 'voided' && order.status !== 'completed' && (
                          <button onClick={() => setVoidTarget(order)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Void">
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Order detail modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`Order ${selected.order_number}`} size="lg">
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-muted-foreground">Date: </span>{formatDateTime(selected.created_at)}</div>
              <div><span className="text-muted-foreground">Type: </span>{orderTypeLabel(selected.order_type)}</div>
              {selected.table_number && <div><span className="text-muted-foreground">Table: </span>{selected.table_number}</div>}
              {selected.customer_name && <div><span className="text-muted-foreground">Customer: </span>{selected.customer_name}</div>}
              <Badge className={statusColor(selected.status)}>{selected.status}</Badge>
            </div>

            <table className="w-full text-sm border rounded-lg overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  {['Item', 'Qty', 'Unit Price', 'Total'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selected.items ?? []).map((item, i) => {
                  const mods: { name: string }[] = item.modifiers_json ? (() => { try { return JSON.parse(item.modifiers_json!) } catch { return [] } })() : []
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">
                        <p>{item.product_name}</p>
                        {mods.length > 0 && <p className="text-xs text-muted-foreground">{mods.map((m) => m.name).join(', ')}</p>}
                        {item.notes && <p className="text-xs italic text-orange-600">{item.notes}</p>}
                      </td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{fmt(item.unit_price + item.modifiers_price)}</td>
                      <td className="px-3 py-2 font-semibold">{fmt(item.line_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8"><span className="text-muted-foreground">Subtotal</span><span>{fmt(selected.subtotal)}</span></div>
              {selected.discount_amount > 0 && (
                <div className="flex gap-8 text-green-600"><span>Discount</span><span>−{fmt(selected.discount_amount)}</span></div>
              )}
              <div className="flex gap-8"><span className="text-muted-foreground">Tax</span><span>{fmt(selected.tax_amount)}</span></div>
              <div className="flex gap-8 text-lg font-bold"><span>Total</span><span>{fmt(selected.total)}</span></div>
            </div>

            {(selected.payments ?? []).length > 0 && (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-muted-foreground">Payments</p>
                {selected.payments.map((p, i) => (
                  <div key={i} className="flex gap-4 capitalize">
                    <span className="w-20">{p.method}</span>
                    <span>{fmt(p.amount)}</span>
                    {p.change_given != null && p.change_given > 0 && (
                      <span className="text-muted-foreground">Change: {fmt(p.change_given)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Void confirm */}
      {voidTarget && (
        <ConfirmDialog
          open
          title="Void Order"
          message={`Are you sure you want to void order ${voidTarget.order_number}? This cannot be undone.`}
          confirmLabel="Void Order"
          destructive
          onConfirm={() => handleVoid(voidTarget)}
          onCancel={() => setVoidTarget(null)}
        />
      )}

      {/* Collect payment modal */}
      {payTarget && (
        <Modal open onClose={() => setPayTarget(null)} title={`Collect Payment — ${payTarget.order_number}`} size="sm">
          <div className="p-6 space-y-5">
            <div className="rounded-xl bg-muted/50 px-4 py-3 flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Amount Due</span>
              <span className="text-2xl font-bold text-primary">{fmt(payTarget.total)}</span>
            </div>
            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {([
                  { m: 'cash', label: 'Cash', Icon: Banknote },
                  { m: 'card', label: 'Card', Icon: CreditCard }
                ] as const).map(({ m, label, Icon }) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors
                      ${payMethod === m ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {payMethod === 'cash' && (
              <div>
                <Label>Cash Tendered</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payTendered}
                  onChange={(e) => setPayTendered(e.target.value)}
                  placeholder={String(payTarget.total)}
                  autoFocus
                />
                {parseFloat(payTendered) > 0 && parseFloat(payTendered) >= payTarget.total && (
                  <p className="mt-1.5 text-sm font-medium text-green-600">
                    Change: {fmt(parseFloat(payTendered) - payTarget.total)}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button
                onClick={handleCollectPayment}
                disabled={payMethod === 'cash' && (parseFloat(payTendered) || 0) < payTarget.total}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
