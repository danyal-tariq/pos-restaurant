import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { showToast } from '../../components/ui/toast'
import { Button, Input, Label, Spinner } from '../../components/ui/index'
import { cn } from '../../lib/utils'
import { useCartStore, useSessionStore, useSettingsStore } from '../../store'
import { useTaxRate } from '../../hooks/useSettings'
import type { OrderSummary, Discount, Order } from '../../types'
import { CreditCard, Banknote, SplitSquareVertical, Tag } from 'lucide-react'

interface PaymentModalProps {
  summary: OrderSummary
  onClose: () => void
  onSuccess: () => void
  fmt: (n: number) => string
}

type Step = 'method' | 'cash' | 'card' | 'discount' | 'processing'

export function PaymentModal({ onClose, onSuccess, fmt }: PaymentModalProps): JSX.Element {
  const cart = useCartStore()
  const { currentEmployee, currentShift } = useSessionStore()
  const settings = useSettingsStore((s) => s.settings)
  const { rate: taxRate, inclusive: taxInclusive } = useTaxRate()

  const [step, setStep] = useState<Step>('method')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash')
  const [cashTendered, setCashTendered] = useState('')
  const [splitCash, setSplitCash] = useState('')
  const [splitCard, setSplitCard] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([])
  const [couponError, setCouponError] = useState('')
  const [processing, setProcessing] = useState(false)

  const recalcSummary = cart.calcSummary(taxRate, taxInclusive)

  const tendered = parseFloat(cashTendered) || 0
  const change = Math.max(0, tendered - recalcSummary.total)

  useEffect(() => {
    window.api.discounts.getAll().then((d) => setAvailableDiscounts(d as Discount[]))
  }, [])

  const handleApplyCoupon = async (): Promise<void> => {
    setCouponError('')
    if (!couponCode.trim()) return
    const disc = (await window.api.discounts.getByCode(couponCode.trim())) as Discount | null
    if (!disc) {
      setCouponError('Invalid coupon code')
      return
    }
    const { valid, reason } = await window.api.discounts.validate(disc.id, recalcSummary.subtotal)
    if (!valid) {
      setCouponError(reason ?? 'Invalid')
      return
    }
    const amount =
      disc.type === 'percentage'
        ? Math.min((recalcSummary.subtotal * disc.value) / 100, recalcSummary.subtotal)
        : Math.min(disc.value, recalcSummary.subtotal)
    cart.applyDiscount({
      discount_id: disc.id,
      name: disc.name,
      type: disc.type,
      value: disc.value,
      amount
    })
    setCouponCode('')
  }

  const handleApplyDiscount = async (disc: Discount): Promise<void> => {
    const already = cart.appliedDiscounts.find((d) => d.discount_id === disc.id)
    if (already) return
    const { valid, reason } = await window.api.discounts.validate(disc.id, recalcSummary.subtotal)
    if (!valid) {
      showToast(reason ?? 'Invalid discount', 'error')
      return
    }
    const amount =
      disc.type === 'percentage'
        ? Math.min((recalcSummary.subtotal * disc.value) / 100, recalcSummary.subtotal)
        : Math.min(disc.value, recalcSummary.subtotal)
    cart.applyDiscount({
      discount_id: disc.id,
      name: disc.name,
      type: disc.type,
      value: disc.value,
      amount
    })
  }

  const handleCharge = async (): Promise<void> => {
    setProcessing(true)
    setStep('processing')
    try {
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

      const payments: {
        method: string
        amount: number
        tendered?: number
        change_given?: number
      }[] = []
      if (paymentMethod === 'cash') {
        payments.push({
          method: 'cash',
          amount: finalSummary.total,
          tendered,
          change_given: change
        })
      } else if (paymentMethod === 'card') {
        payments.push({ method: 'card', amount: finalSummary.total })
      } else {
        const cashAmt = parseFloat(splitCash) || 0
        const cardAmt = parseFloat(splitCard) || 0
        if (cashAmt > 0) payments.push({ method: 'cash', amount: cashAmt, tendered: cashAmt })
        if (cardAmt > 0) payments.push({ method: 'card', amount: cardAmt })
      }

      const discounts = cart.appliedDiscounts.map((d) => ({ ...d }))

      const order = (await window.api.orders.create(
        orderData,
        items,
        payments,
        discounts
      )) as unknown as Order

      // Print receipt
      const employee = currentEmployee
      const receiptData = {
        shopName: settings?.shop_name ?? 'Restaurant POS',
        shopAddress: settings?.shop_address ?? '',
        shopPhone: settings?.shop_phone ?? '',
        orderNumber: order.order_number,
        orderType: cart.orderType,
        tableNumber: cart.tableNumber || undefined,
        customerName: cart.customerName || undefined,
        items: cart.items.map((item) => ({
          name: item.product_name,
          modifiers:
            item.modifiers.length > 0 ? item.modifiers.map((m) => m.name).join(', ') : undefined,
          qty: item.quantity,
          unitPrice: item.unit_price + item.modifiers_price,
          total: item.line_total
        })),
        subtotal: finalSummary.subtotal,
        discountAmount: finalSummary.discountAmount,
        taxAmount: finalSummary.taxAmount,
        total: finalSummary.total,
        paymentMethod,
        tendered: paymentMethod === 'cash' ? tendered : undefined,
        change: paymentMethod === 'cash' ? change : undefined,
        receiptFooter: settings?.receipt_footer ?? 'Thank you!',
        createdAt: new Date().toLocaleString(),
        employeeName: employee?.name
      }
      await window.api.printer.receipt(receiptData)
      await window.api.printer.kitchen({
        orderNumber: order.order_number,
        orderType: cart.orderType,
        tableNumber: cart.tableNumber || undefined,
        customerName: cart.customerName || undefined,
        items: cart.items.map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          modifiers:
            item.modifiers.length > 0 ? item.modifiers.map((m) => m.name).join(', ') : undefined,
          notes: item.notes || undefined
        })),
        notes: cart.notes || undefined,
        createdAt: new Date().toLocaleTimeString()
      })

      await window.api.customer.showPayment({
        total: finalSummary.total,
        method: paymentMethod,
        change: paymentMethod === 'cash' ? change : undefined
      })
      await window.api.customer.clearDisplay()
      cart.clearCart()
      showToast(`Order ${order.order_number} completed!`, 'success')
      onSuccess()
    } catch (err) {
      console.error(err)
      showToast('Failed to process order. Please try again.', 'error')
      setStep('method')
      setProcessing(false)
    }
  }

  const quickCashAmounts = [5, 10, 20, 50, 100].filter((a) => a >= recalcSummary.total)
  const exactAmount = Math.ceil(recalcSummary.total)

  return (
    <Modal open onClose={onClose} title="Checkout" size="lg">
      {step === 'processing' ? (
        <div className="flex flex-col items-center justify-center gap-4 p-12">
          <Spinner className="h-12 w-12" />
          <p className="text-lg font-medium">Processing payment...</p>
        </div>
      ) : (
        <div className="p-6 space-y-5">
          {/* Order summary */}
          <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{fmt(recalcSummary.subtotal)}</span>
            </div>
            {recalcSummary.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{fmt(recalcSummary.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{fmt(recalcSummary.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-primary">{fmt(recalcSummary.total)}</span>
            </div>
          </div>

          {/* Discounts section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4" />
              <span>Discounts</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleApplyCoupon}>
                Apply
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            {availableDiscounts.filter((d) => !d.code).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableDiscounts
                  .filter((d) => !d.code)
                  .map((disc) => (
                    <button
                      key={disc.id}
                      onClick={() => handleApplyDiscount(disc)}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border transition-colors',
                        cart.appliedDiscounts.find((a) => a.discount_id === disc.id)
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : 'hover:bg-accent'
                      )}
                    >
                      {disc.name} ({disc.type === 'percentage' ? `${disc.value}%` : fmt(disc.value)}
                      )
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { method: 'cash', label: 'Cash', icon: Banknote },
                  { method: 'card', label: 'Card', icon: CreditCard },
                  { method: 'split', label: 'Split', icon: SplitSquareVertical }
                ] as const
              ).map(({ method, label, icon: Icon }) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 transition-colors',
                    paymentMethod === method
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-accent'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash input */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Amount Tendered</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={recalcSummary.total}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={fmt(recalcSummary.total)}
                  className="text-xl h-12"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCashTendered(String(recalcSummary.total.toFixed(2)))}
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-accent"
                >
                  Exact
                </button>
                {[exactAmount, ...quickCashAmounts]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .slice(0, 4)
                  .map((a) => (
                    <button
                      key={a}
                      onClick={() => setCashTendered(String(a))}
                      className="px-3 py-1.5 rounded-lg border text-sm hover:bg-accent"
                    >
                      {fmt(a)}
                    </button>
                  ))}
              </div>
              {tendered > 0 && tendered >= recalcSummary.total && (
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                  <span className="text-sm font-medium text-green-800">Change</span>
                  <span className="text-2xl font-bold text-green-700">{fmt(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split payment */}
          {paymentMethod === 'split' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cash amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Card amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={splitCard}
                  onChange={(e) => setSplitCard(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {(parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) !==
                recalcSummary.total && (
                <p className="col-span-2 text-xs text-destructive">
                  Split total must equal {fmt(recalcSummary.total)}
                </p>
              )}
            </div>
          )}

          {/* Charge button */}
          <Button
            className="w-full h-14 text-lg"
            onClick={handleCharge}
            disabled={
              processing ||
              (paymentMethod === 'cash' && tendered < recalcSummary.total) ||
              (paymentMethod === 'split' &&
                Math.abs(
                  (parseFloat(splitCash) || 0) + (parseFloat(splitCard) || 0) - recalcSummary.total
                ) > 0.01)
            }
          >
            {processing ? <Spinner className="h-5 w-5" /> : `Charge ${fmt(recalcSummary.total)}`}
          </Button>
        </div>
      )}
    </Modal>
  )
}
