import { useEffect, useState } from 'react'
import { cn, orderTypeLabel } from '../../lib/utils'
import { useCartStore, useSessionStore } from '../../store'
import { useTaxRate, useCurrency } from '../../hooks/useSettings'
import { PaymentModal } from './PaymentModal'
import { ModifierModal } from './ModifierModal'
import { Button, Badge, EmptyState, Spinner } from '../../components/ui/index'
import { Modal } from '../../components/ui/Modal'
import { showToast } from '../../components/ui/toast'
import type { Category, Product, ModifierGroup } from '../../types'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  PauseCircle,
  PlayCircle,
  UtensilsCrossed,
  Package,
  Bike
} from 'lucide-react'

export function POSPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [modifierModalProduct, setModifierModalProduct] = useState<Product | null>(null)
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [showHeldOrders, setShowHeldOrders] = useState(false)
  const [holdLabel, setHoldLabel] = useState('')
  const [showHoldInput, setShowHoldInput] = useState(false)

  const cart = useCartStore()
  const { currentEmployee, currentShift } = useSessionStore()
  const { rate: taxRate, inclusive: taxInclusive } = useTaxRate()
  const fmt = useCurrency()
  const summary = cart.calcSummary(taxRate, taxInclusive)

  useEffect(() => {
    Promise.all([window.api.categories.getAll(), window.api.products.getAll()]).then(
      ([cats, prods]) => {
        const c = cats as Category[]
        setCategories(c)
        setProducts(prods as Product[])
        if (c.length > 0) setSelectedCategory(c[0].id)
        setLoading(false)
      }
    )
  }, [])

  // Sync cart with customer display
  useEffect(() => {
    window.api.customer.updateCart({
      items: cart.items,
      subtotal: summary.subtotal,
      discountAmount: summary.discountAmount,
      taxAmount: summary.taxAmount,
      total: summary.total,
      orderType: cart.orderType,
      tableNumber: cart.tableNumber || undefined,
      customerName: cart.customerName || undefined
    })
  }, [cart.items, summary, cart.orderType, cart.tableNumber, cart.customerName])

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products.filter((p) => p.category_id === selectedCategory)

  const handleProductClick = async (product: Product): Promise<void> => {
    const groups = (await window.api.products.getModifierGroups(product.id)) as ModifierGroup[]
    if (groups.length > 0) {
      setModifierGroups(groups)
      setModifierModalProduct(product)
    } else {
      cart.addItem({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        modifiers: [],
        modifiers_price: 0,
        notes: ''
      })
    }
  }

  const handleModifierConfirm = (
    product: Product,
    selectedModifiers: { modifier_id: number; name: string; price_delta: number }[]
  ): void => {
    const modifiersPrice = selectedModifiers.reduce((acc, m) => acc + m.price_delta, 0)
    cart.addItem({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      modifiers: selectedModifiers,
      modifiers_price: modifiersPrice,
      notes: ''
    })
    setModifierModalProduct(null)
  }

  const handleHoldOrder = (): void => {
    const label =
      holdLabel.trim() || `Table ${cart.tableNumber || 'Hold ' + (cart.heldOrders.length + 1)}`
    cart.holdCurrentOrder(label)
    setShowHoldInput(false)
    setHoldLabel('')
  }

  const handleSendToKitchen = async (): Promise<void> => {
    if (cart.items.length === 0) return
    const finalSummary = cart.calcSummary(taxRate, taxInclusive)
    const orderData = {
      shift_id: currentShift?.id ?? null,
      employee_id: currentEmployee?.id ?? null,
      order_type: cart.orderType,
      table_number: cart.tableNumber || null,
      customer_name: cart.customerName || null,
      status: 'pending' as const,
      subtotal: finalSummary.subtotal,
      discount_amount: finalSummary.discountAmount,
      tax_amount: finalSummary.taxAmount,
      total: finalSummary.total,
      notes: cart.notes || null
    }
    const items = cart.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      modifiers_json: item.modifiers.length > 0 ? JSON.stringify(item.modifiers) : null,
      modifiers_price: item.modifiers_price,
      notes: item.notes || null
    }))
    try {
      const order = (await window.api.orders.create(
        orderData,
        items,
        [],
        cart.appliedDiscounts.map((d) => ({ ...d }))
      )) as { order_number: string }
      cart.clearCart()
      showToast(`Order ${order.order_number} sent to kitchen!`, 'success')
    } catch (err) {
      console.error(err)
      showToast('Failed to send order. Please try again.', 'error')
    }
  }

  const orderTypeIcons = {
    dine_in: <UtensilsCrossed className="h-4 w-4" />,
    takeaway: <Package className="h-4 w-4" />,
    delivery: <Bike className="h-4 w-4" />
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Menu Panel ────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3 bg-card">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Order type */}
          <div className="flex gap-1">
            {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
              <button
                key={type}
                onClick={() => cart.setOrderType(type)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  cart.orderType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-accent'
                )}
              >
                {orderTypeIcons[type]}
                {orderTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* Table number */}
          {cart.orderType === 'dine_in' && (
            <input
              type="text"
              placeholder="Table #"
              value={cart.tableNumber}
              onChange={(e) => cart.setTableNumber(e.target.value)}
              className="w-20 px-2 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}

          {/* Customer name */}
          <input
            type="text"
            placeholder="Customer name"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
            className="w-36 px-2 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {/* Held orders */}
          {cart.heldOrders.length > 0 && (
            <button
              onClick={() => setShowHeldOrders(true)}
              className="relative flex items-center gap-1 px-3 py-2 rounded-lg border hover:bg-accent text-sm"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Held</span>
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                {cart.heldOrders.length}
              </Badge>
            </button>
          )}
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-1 overflow-x-auto px-4 py-2 border-b bg-card scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  selectedCategory === cat.id
                    ? 'text-white shadow-sm'
                    : 'border hover:border-primary/50 hover:bg-accent'
                )}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={searchQuery ? '🔍' : '🍽️'}
              title={searchQuery ? 'No products found' : 'No products in this category'}
              description={
                searchQuery ? 'Try a different search term' : 'Add products in Menu Management'
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product)}
                  fmt={fmt}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart Panel ───────────────────────────── */}
      <div className="w-80 xl:w-96 border-l bg-card flex flex-col shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold">Order</span>
            {cart.items.length > 0 && <Badge variant="secondary">{cart.items.length}</Badge>}
          </div>
          <div className="flex gap-1">
            {cart.items.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHoldInput(true)}
                  title="Hold Order"
                >
                  <PauseCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => cart.clearCart()}
                  title="Clear Cart"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto py-2">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-10 w-10 text-muted-foreground" />}
              title="Cart is empty"
              description="Tap items to add them"
            />
          ) : (
            cart.items.map((item) => <CartItemRow key={item.id} item={item} fmt={fmt} />)
          )}
        </div>

        {/* Applied discounts */}
        {cart.appliedDiscounts.length > 0 && (
          <div className="border-t px-4 py-2 space-y-1">
            {cart.appliedDiscounts.map((disc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-green-600 truncate flex-1">{disc.name}</span>
                <span className="text-green-600 font-medium ml-2">-{fmt(disc.amount)}</span>
                <button
                  onClick={() => cart.removeDiscount(i)}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Order summary */}
        <div className="border-t px-4 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{fmt(summary.subtotal)}</span>
          </div>
          {summary.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{fmt(summary.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Tax</span>
            <span>{fmt(summary.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-1 border-t">
            <span>Total</span>
            <span className="text-primary">{fmt(summary.total)}</span>
          </div>
        </div>

        {/* Checkout button */}
        <div className="px-4 pb-4 space-y-2">
          <Button
            className="w-full h-14 text-lg"
            disabled={cart.items.length === 0}
            onClick={() => setShowPayment(true)}
          >
            Charge {fmt(summary.total)}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={cart.items.length === 0}
            onClick={handleSendToKitchen}
          >
            Send to Kitchen (Pay Later)
          </Button>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}
      {modifierModalProduct && (
        <ModifierModal
          product={modifierModalProduct}
          groups={modifierGroups}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierModalProduct(null)}
          fmt={fmt}
        />
      )}

      {showPayment && (
        <PaymentModal
          summary={summary}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false)
          }}
          fmt={fmt}
        />
      )}

      {/* Hold order label input */}
      <Modal
        open={showHoldInput}
        onClose={() => setShowHoldInput(false)}
        title="Hold Order"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Give this order a label so you can find it easily.
          </p>
          <input
            type="text"
            placeholder={`Order ${cart.heldOrders.length + 1}`}
            value={holdLabel}
            onChange={(e) => setHoldLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === 'Enter' && handleHoldOrder()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowHoldInput(false)}>
              Cancel
            </Button>
            <Button onClick={handleHoldOrder}>Hold Order</Button>
          </div>
        </div>
      </Modal>

      {/* Held orders list */}
      <Modal
        open={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
        title="Held Orders"
        size="sm"
      >
        <div className="p-4 space-y-2">
          {cart.heldOrders.map((held) => (
            <div key={held.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{held.label}</p>
                <p className="text-xs text-muted-foreground">{held.items.length} items</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  cart.resumeHeldOrder(held.id)
                  setShowHeldOrders(false)
                }}
              >
                Resume
              </Button>
              <Button size="sm" variant="destructive" onClick={() => cart.deleteHeldOrder(held.id)}>
                Delete
              </Button>
            </div>
          ))}
          {cart.heldOrders.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No held orders</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ── ProductCard ────────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onClick,
  fmt
}: {
  product: Product
  onClick: () => void
  fmt: (n: number) => string
}): JSX.Element {
  return (
    <button className="menu-item-btn" onClick={onClick}>
      {product.image_path ? (
        <img
          src={product.image_path}
          alt={product.name}
          className="h-16 w-16 object-cover rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
          🍽️
        </div>
      )}
      <p className="text-xs font-medium leading-tight line-clamp-2 w-full">{product.name}</p>
      <p className="text-sm font-bold text-primary">{fmt(product.price)}</p>
      {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
    </button>
  )
}

// ── CartItemRow ────────────────────────────────────────────────────────────────
function CartItemRow({
  item,
  fmt
}: {
  item: import('../../types').CartItem
  fmt: (n: number) => string
}): JSX.Element {
  const { updateItemQty, removeItem } = useCartStore()

  return (
    <div className="cart-item mx-2">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.product_name}</p>
        {item.modifiers.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            + {item.modifiers.map((m) => m.name).join(', ')}
          </p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground italic truncate">
            &ldquo;{item.notes}&rdquo;
          </p>
        )}
        <p className="text-xs font-medium text-primary">{fmt(item.line_total)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => updateItemQty(item.id, item.quantity - 1)}
          className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-accent transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
        <button
          onClick={() => updateItemQty(item.id, item.quantity + 1)}
          className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-accent transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => removeItem(item.id)}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground ml-1"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
