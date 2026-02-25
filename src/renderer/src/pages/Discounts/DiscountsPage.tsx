import React, { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '../../hooks/useSettings'
import { formatDateTime } from '../../lib/utils'
import { Button, Input, Label, Badge, Spinner, EmptyState, Card } from '../../components/ui/index'
import { Modal, ConfirmDialog, showToast } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, Tag, Clock } from 'lucide-react'
import type { Discount } from '../../types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DiscountFormProps {
  initial?: Partial<Discount>
  onSave: (data: Partial<Discount>) => void
  onClose: () => void
}
function DiscountForm({ initial, onSave, onClose }: DiscountFormProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<'percentage' | 'fixed'>(initial?.type ?? 'percentage')
  const [value, setValue] = useState(String(initial?.value ?? ''))
  const [code, setCode] = useState(initial?.code ?? '')
  const [minOrder, setMinOrder] = useState(String(initial?.min_order_amount ?? ''))
  const [maxUses, setMaxUses] = useState(String(initial?.max_uses ?? ''))
  const [startTime, setStartTime] = useState(initial?.start_time ?? '')
  const [endTime, setEndTime] = useState(initial?.end_time ?? '')
  const [days, setDays] = useState<number[]>(initial?.days_of_week ?? [])
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const toggleDay = (d: number): void => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  return (
    <Modal open onClose={onClose} title={initial?.id ? 'Edit Discount' : 'New Discount'} size="lg">
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Happy Hour 20%" autoFocus />
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex gap-2 mt-1">
            {(['percentage', 'fixed'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${type === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                {t === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Value ({type === 'percentage' ? '%' : 'amount'}) *</Label>
          <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'percentage' ? '10' : '5.00'} />
        </div>
        <div>
          <Label>Coupon Code (optional)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SAVE10" className="uppercase" />
        </div>
        <div>
          <Label>Minimum Order Amount</Label>
          <Input type="number" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label>Max Uses (0 = unlimited)</Label>
          <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>Start Time (happy hour)</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label>End Time</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Active Days (leave empty for every day)</Label>
          <div className="flex gap-2 mt-1">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors
                  ${days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="disc_active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          <Label htmlFor="disc_active">Active</Label>
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => name && value && onSave({
            name, type, value: parseFloat(value),
            code: code.trim().toUpperCase() || null,
            min_order_amount: minOrder ? parseFloat(minOrder) : 0,
            max_uses: maxUses ? parseInt(maxUses) : 0,
            start_time: startTime || null, end_time: endTime || null,
            days_of_week: days.length > 0 ? days : null,
            is_active: isActive
          })}>Save Discount</Button>
        </div>
      </div>
    </Modal>
  )
}

export function DiscountsPage(): JSX.Element {
  const fmt = useCurrency()
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<{ open: boolean; initial?: Partial<Discount> }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null)

  const load = useCallback(async () => {
    const d = await window.api.discounts.getAll() as Discount[]
    setDiscounts(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: Partial<Discount>): Promise<void> => {
    if (form.initial?.id) {
      await window.api.discounts.update(form.initial.id, data)
      showToast('Discount updated', 'success')
    } else {
      await window.api.discounts.create(data)
      showToast('Discount created', 'success')
    }
    setForm({ open: false })
    load()
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await window.api.discounts.delete(deleteTarget.id)
    showToast('Discount deleted', 'success')
    setDeleteTarget(null)
    load()
  }

  const handleToggleActive = async (disc: Discount): Promise<void> => {
    await window.api.discounts.update(disc.id, { is_active: !disc.is_active })
    load()
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Discounts & Promotions</h1>
        <Button onClick={() => setForm({ open: true })}>
          <Plus className="h-4 w-4 mr-1" /> New Discount
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1"><Spinner className="h-8 w-8" /></div>
      ) : discounts.length === 0 ? (
        <EmptyState
          title="No discounts"
          description="Create promotions, coupon codes, and happy hour deals"
          action={<button className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => setForm({ open: true })}>Create Discount</button>}
        />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {discounts.map((disc) => (
            <Card key={disc.id} className={`p-5 ${!disc.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="font-semibold truncate">{disc.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {disc.type === 'percentage' ? `${disc.value}% off` : `${fmt(disc.value)} off`}
                    </Badge>
                    {disc.code && (
                      <Badge variant="outline" className="text-xs font-mono">{disc.code}</Badge>
                    )}
                    {disc.start_time && disc.end_time && (
                      <Badge variant="info" className="text-xs">
                        <Clock className="h-2.5 w-2.5 mr-1" />{disc.start_time}–{disc.end_time}
                      </Badge>
                    )}
                    {disc.min_order_amount > 0 && (
                      <Badge variant="outline" className="text-xs">Min: {fmt(disc.min_order_amount)}</Badge>
                    )}
                    {disc.max_uses > 0 && (
                      <Badge variant="outline" className="text-xs">Max {disc.max_uses} uses</Badge>
                    )}
                    {disc.days_of_week && disc.days_of_week.length > 0 && (
                      <Badge variant="outline" className="text-xs">{disc.days_of_week.map((d) => DAYS[d]).join(', ')}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => setForm({ open: true, initial: disc })} className="p-1.5 rounded hover:bg-accent">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(disc)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <Badge variant={disc.is_active ? 'success' : 'outline'}>{disc.is_active ? 'Active' : 'Inactive'}</Badge>
                <button
                  onClick={() => handleToggleActive(disc)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {disc.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {form.open && <DiscountForm initial={form.initial} onSave={handleSave} onClose={() => setForm({ open: false })} />}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Delete Discount"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
