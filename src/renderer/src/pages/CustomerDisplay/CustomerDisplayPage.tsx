import React, { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { ShoppingCart, CheckCircle2, Utensils } from 'lucide-react'

interface DisplayCartItem {
  product_name: string
  quantity: number
  unit_price: number
  modifiers_price: number
  line_total: number
}

interface CartPayload {
  items: DisplayCartItem[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  orderType: string
  tableNumber?: string
  customerName?: string
}

interface PaymentPayload {
  total: number
  method: string
  change?: number
}

type Mode = 'idle' | 'cart' | 'payment' | 'thankyou'

function formatAmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CustomerDisplayPage(): JSX.Element {
  const [mode, setMode] = useState<Mode>('idle')
  const [cart, setCart] = useState<CartPayload | null>(null)
  const [payment, setPayment] = useState<PaymentPayload | null>(null)
  const [shopName, setShopName] = useState('Welcome!')

  useEffect(() => {
    window.api.settings.getAll().then((s) => {
      setShopName((s as Record<string, string>)['shop_name'] ?? 'Welcome!')
    })

    const onCart = (data: CartPayload): void => {
      if (!data.items || data.items.length === 0) {
        setCart(null)
        setMode('idle')
        return
      }
      setCart(data)
      setMode('cart')
    }
    const onPayment = (data: PaymentPayload): void => {
      setPayment(data)
      setMode('payment')
    }
    const onClear = (): void => {
      setTimeout(() => {
        setMode('idle')
        setCart(null)
        setPayment(null)
      }, 3000)
      setMode('thankyou')
    }

    window.api.on('display:updateCart', onCart as (...args: unknown[]) => void)
    window.api.on('display:showPayment', onPayment as (...args: unknown[]) => void)
    window.api.on('display:clear', onClear)
    return () => {
      window.api.off('display:updateCart', onCart as (...args: unknown[]) => void)
      window.api.off('display:showPayment', onPayment as (...args: unknown[]) => void)
      window.api.off('display:clear', onClear as (...args: unknown[]) => void)
    }
  }, [])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-primary/90 shadow-lg">
        <div className="flex items-center gap-3">
          <Utensils className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-wide">{shopName}</h1>
        </div>
        {cart && (
          <div className="text-sm text-white/80">
            {cart.orderType === 'dine_in' && cart.tableNumber
              ? `Table ${cart.tableNumber}`
              : cart.orderType === 'takeaway'
                ? 'Takeaway'
                : 'Delivery'}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {mode === 'idle' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center">
                <Utensils className="h-16 w-16 text-primary/60" />
              </div>
            </div>
            <div>
              <h2 className="text-5xl font-bold text-white/90 mb-2">Welcome!</h2>
              <p className="text-xl text-white/50">Please proceed to the counter</p>
            </div>
          </div>
        )}

        {mode === 'cart' && cart && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold">Your Order</h2>
            </div>

            {/* Items */}
            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
              {cart.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-white/10 px-5 py-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {item.quantity} × {item.product_name}
                    </p>
                    {item.modifiers_price > 0 && (
                      <p className="text-xs text-white/60">
                        +{formatAmt(item.modifiers_price)} extras
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatAmt(item.line_total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-white/10 px-6 py-5 space-y-2 text-base">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>{formatAmt(cart.subtotal)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>−{formatAmt(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white/70">
                <span>Tax</span>
                <span>{formatAmt(cart.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-3xl font-bold border-t border-white/20 pt-3 mt-2">
                <span>Total</span>
                <span className="text-primary">{formatAmt(cart.total)}</span>
              </div>
            </div>
          </div>
        )}

        {mode === 'payment' && payment && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-14 w-14 text-green-400" />
            </div>
            <div>
              <p className="text-xl text-white/60 mb-1">Total Paid</p>
              <p className="text-6xl font-bold text-green-400">{formatAmt(payment.total)}</p>
              <p className="text-lg text-white/60 mt-2 capitalize">{payment.method}</p>
            </div>
            {payment.change !== undefined && payment.change > 0 && (
              <div className="rounded-2xl bg-yellow-500/20 border border-yellow-400/50 px-8 py-4">
                <p className="text-sm text-yellow-300 mb-0.5">Change Due</p>
                <p className="text-4xl font-bold text-yellow-300">{formatAmt(payment.change)}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'thankyou' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="h-28 w-28 rounded-full bg-primary/30 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <div>
              <h2 className="text-5xl font-bold text-white mb-3">Thank You!</h2>
              <p className="text-xl text-white/60">We hope to see you again soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-black/40 text-center text-white/40 text-sm">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  )
}
