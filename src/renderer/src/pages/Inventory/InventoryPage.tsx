import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '../../hooks/useSettings'
import { Button, Input, Label, Badge, Spinner, EmptyState, Card } from '../../components/ui/index'
import { Modal } from '../../components/ui/Modal'
import { showToast } from '../../components/ui/toast'
import { Plus, Pencil, AlertTriangle, Package } from 'lucide-react'
import type { InventoryItem } from '../../types'

interface AdjustForm {
  open: boolean
  item?: InventoryItem
}

interface ItemFormData {
  name: string
  unit: string
  quantity: number
  threshold: number
  cost_per_unit: number
}

export function InventoryPage(): JSX.Element {
  const fmt = useCurrency()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ open: false })
  const [itemForm, setItemForm] = useState<{ open: boolean; initial?: Partial<InventoryItem> }>({
    open: false
  })
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add')
  const [adjustReason, setAdjustReason] = useState('')
  const [valuation, setValuation] = useState<{ total_value: number; items: unknown[] } | null>(null)

  const load = useCallback(async () => {
    const [inv, val] = await Promise.all([
      window.api.inventory.getAll() as Promise<InventoryItem[]>,
      window.api.inventory.getValuation() as Promise<{ total_value: number; items: unknown[] }>
    ])
    setItems(inv)
    setValuation(val)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    const matchLow = !lowStockOnly || i.quantity <= i.threshold
    return matchSearch && matchLow
  })

  const handleAdjust = async (): Promise<void> => {
    if (!adjustForm.item || !adjustQty) return
    const qty = parseFloat(adjustQty)
    // convert type+qty to signed delta for IPC
    let delta: number
    if (adjustType === 'add') delta = qty
    else if (adjustType === 'remove') delta = -qty
    else delta = qty - (adjustForm.item?.quantity ?? 0) // 'set'
    await window.api.inventory.adjust(adjustForm.item.id, delta, adjustReason || adjustType)
    showToast('Stock adjusted successfully', 'success')
    setAdjustForm({ open: false })
    setAdjustQty('')
    setAdjustReason('')
    load()
  }

  const handleSaveItem = async (data: ItemFormData): Promise<void> => {
    if (itemForm.initial?.id) {
      await window.api.inventory.update(itemForm.initial.id, data)
      showToast('Item updated', 'success')
    } else {
      await window.api.inventory.create(data)
      showToast('Item created', 'success')
    }
    setItemForm({ open: false })
    load()
  }

  const lowStockCount = items.filter((i) => i.quantity <= i.threshold).length

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          {valuation && (
            <p className="text-sm text-muted-foreground">
              {(valuation.items as unknown[]).length} items · Total value:{' '}
              {fmt(valuation.total_value)}
            </p>
          )}
        </div>
        <Button onClick={() => setItemForm({ open: true })}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Stats */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-medium">
            {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} below minimum stock level
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="h-4 w-4"
          />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <Card className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No inventory items"
            description="Add stock items to track"
            action={
              <button
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                onClick={() => setItemForm({ open: true })}
              >
                Add Item
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {[
                  'Item',
                  'Unit',
                  'Current Stock',
                  'Min Level',
                  'Cost/Unit',
                  'Total Value',
                  'Status',
                  ''
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isLow = item.quantity <= item.threshold
                return (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${isLow ? 'text-destructive' : ''}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.threshold}</td>
                    <td className="px-4 py-3">{fmt(item.cost_per_unit)}</td>
                    <td className="px-4 py-3">{fmt(item.quantity * item.cost_per_unit)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isLow ? 'destructive' : 'success'}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setAdjustForm({ open: true, item })}
                          className="p-1.5 rounded hover:bg-accent"
                          title="Adjust Stock"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setItemForm({ open: true, initial: item })}
                          className="p-1.5 rounded hover:bg-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Adjust modal */}
      {adjustForm.open && adjustForm.item && (
        <Modal
          open
          onClose={() => setAdjustForm({ open: false })}
          title={`Adjust: ${adjustForm.item.name}`}
          size="sm"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Current stock:</span>
              <span className="font-bold text-lg">
                {adjustForm.item.quantity} {adjustForm.item.unit}
              </span>
            </div>
            <div>
              <Label>Adjustment Type</Label>
              <div className="flex gap-2 mt-1">
                {(['add', 'remove', 'set'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAdjustType(t)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors capitalize
                      ${adjustType === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                  >
                    {t === 'add' ? '+ Add' : t === 'remove' ? '− Remove' : '= Set'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Quantity ({adjustForm.item.unit})</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Received delivery, Waste, etc."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdjustForm({ open: false })}>
                Cancel
              </Button>
              <Button onClick={handleAdjust} disabled={!adjustQty}>
                Apply Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item form */}
      {itemForm.open && (
        <ItemFormModal
          initial={itemForm.initial}
          onSave={handleSaveItem}
          onClose={() => setItemForm({ open: false })}
        />
      )}
    </div>
  )
}

function ItemFormModal({
  initial,
  onSave,
  onClose
}: {
  initial?: Partial<InventoryItem>
  onSave: (data: ItemFormData) => void
  onClose: () => void
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? 'units')
  const [stock, setStock] = useState(String(initial?.quantity ?? 0))
  const [min, setMin] = useState(String(initial?.threshold ?? 5))
  const [cost, setCost] = useState(String(initial?.cost_per_unit ?? 0))
  return (
    <Modal
      open
      onClose={onClose}
      title={initial?.id ? 'Edit Inventory Item' : 'New Inventory Item'}
      size="sm"
    >
      <div className="p-6 space-y-4">
        <div>
          <Label>Item Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Unit (e.g. kg, pcs, L)</Label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <div>
          <Label>Current Stock</Label>
          <Input
            type="number"
            step="0.01"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <div>
          <Label>Min Stock Level (alert threshold)</Label>
          <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div>
          <Label>Cost per Unit</Label>
          <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              name &&
              onSave({
                name,
                unit,
                quantity: parseFloat(stock) || 0,
                threshold: parseFloat(min) || 0,
                cost_per_unit: parseFloat(cost) || 0
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
