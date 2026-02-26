import { useState, useEffect, useCallback } from 'react'
import { useCurrency } from '../../hooks/useSettings'
import {
  Button,
  Input,
  Label,
  Badge,
  Spinner,
  EmptyState,
  Card,
  Textarea
} from '../../components/ui/index'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { showToast } from '../../components/ui/toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Category, Product } from '../../types'

/* ─── Category Form ─────────────────────────────────────────────────── */
const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#78716c'
]
const ICONS = ['🍔', '🍕', '🍟', '🥤', '🍦', '📦', '🌮', '🥗', '🍰', '☕', '🧆', '🍗']

interface CategoryFormProps {
  initial?: Partial<Category>
  onSave: (data: { name: string; color: string; icon: string; sort_order: number }) => void
  onClose: () => void
}
function CategoryForm({ initial, onSave, onClose }: CategoryFormProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [icon, setIcon] = useState(initial?.icon ?? '📦')
  const [sort, setSort] = useState(String(initial?.sort_order ?? 0))
  return (
    <Modal open onClose={onClose} title={initial?.id ? 'Edit Category' : 'New Category'} size="sm">
      <div className="p-6 space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            autoFocus
          />
        </div>
        <div>
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {ICONS.map((em) => (
              <button
                key={em}
                onClick={() => setIcon(em)}
                className={`h-10 w-10 text-2xl rounded-lg border-2 transition-transform flex items-center justify-center ${icon === em ? 'scale-125 border-primary shadow-lg' : 'border-border'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white shadow-lg' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Sort Order</Label>
          <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => name && onSave({ name, color, icon, sort_order: parseInt(sort) || 0 })}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Product Form ────────────────────────────────────────────────────── */
interface ProductFormProps {
  initial?: Partial<Product>
  categories: Category[]
  onSave: (data: Partial<Product>) => void
  onClose: () => void
}
function ProductForm({ initial, categories, onSave, onClose }: ProductFormProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [catId, setCatId] = useState<number | ''>(initial?.category_id ?? categories[0]?.id ?? '')
  const [price, setPrice] = useState(String(initial?.price ?? ''))
  const [cost, setCost] = useState(String(initial?.cost ?? ''))
  const [desc, setDesc] = useState(initial?.description ?? '')
  const [sku, setSku] = useState(initial?.sku ?? '')
  const [trackStock, setTrackStock] = useState<boolean>(!!initial?.track_inventory)
  const [stock, setStock] = useState(String(initial?.stock_quantity ?? 0))
  const [isActive, setIsActive] = useState<boolean>(
    initial?.is_active !== undefined
      ? initial.is_active
      : initial?.active !== undefined
        ? !!initial.active
        : true
  )
  return (
    <Modal open onClose={onClose} title={initial?.id ? 'Edit Product' : 'New Product'} size="lg">
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Product Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken Burger"
            autoFocus
          />
        </div>
        <div>
          <Label>Category *</Label>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={catId}
            onChange={(e) => setCatId(Number(e.target.value))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Price *</Label>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Cost (optional)</Label>
          <Input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>SKU / Barcode</Label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Optional" />
        </div>
        <div className="col-span-2">
          <Label>Description</Label>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            placeholder="Optional description"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="track"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="track">Track Inventory</Label>
        </div>
        {trackStock && (
          <div>
            <Label>Stock Quantity</Label>
            <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="active">Active (visible on POS)</Label>
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              name &&
              price &&
              catId &&
              onSave({
                name,
                category_id: catId as number,
                price: parseFloat(price),
                description: desc || null,
                sku: sku || null,
                image_path: null,
                active: isActive ? 1 : 0,
                track_inventory: trackStock ? 1 : 0
              })
            }
          >
            Save Product
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export function MenuPage(): JSX.Element {
  const fmt = useCurrency()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [catForm, setCatForm] = useState<{ open: boolean; initial?: Partial<Category> }>({
    open: false
  })
  const [prodForm, setProdForm] = useState<{ open: boolean; initial?: Partial<Product> }>({
    open: false
  })
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'product'
    item: Category | Product
  } | null>(null)

  const load = useCallback(async () => {
    const [cats, prods] = await Promise.all([
      window.api.categories.getAll() as Promise<Category[]>,
      window.api.products.getAll(true) as Promise<Product[]>
    ])
    setCategories(cats)
    setProducts(prods)
    if (!selectedCat && cats.length > 0) setSelectedCat(cats[0].id)
    setLoading(false)
  }, [selectedCat])

  useEffect(() => {
    load()
  }, [load])

  const filteredProducts = selectedCat
    ? products.filter((p) => p.category_id === selectedCat)
    : products

  const handleSaveCategory = async (data: {
    name: string
    color: string
    icon: string
    sort_order: number
  }): Promise<void> => {
    if (catForm.initial?.id) {
      await window.api.categories.update(catForm.initial.id, data)
      showToast('Category updated', 'success')
    } else {
      await window.api.categories.create(data)
      showToast('Category created', 'success')
    }
    setCatForm({ open: false })
    load()
  }

  const handleSaveProduct = async (data: Partial<Product>): Promise<void> => {
    if (prodForm.initial?.id) {
      await window.api.products.update(prodForm.initial.id, data)
      showToast('Product updated', 'success')
    } else {
      await window.api.products.create(data)
      showToast('Product created', 'success')
    }
    setProdForm({ open: false })
    load()
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'category') {
      await window.api.categories.delete(deleteTarget.item.id)
      showToast('Category deleted', 'success')
    } else {
      await window.api.products.delete(deleteTarget.item.id)
      showToast('Product deleted', 'success')
    }
    setDeleteTarget(null)
    load()
  }

  const toggleActive = async (p: Product): Promise<void> => {
    await window.api.products.update(p.id, { active: p.active ? 0 : 1 })
    load()
  }

  const selectedCatObj = categories.find((c) => c.id === selectedCat)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Category sidebar */}
      <div className="w-56 border-r flex flex-col bg-muted/20">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">Categories</span>
          <button
            onClick={() => setCatForm({ open: true })}
            className="p-1 rounded hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${selectedCat === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}
            >
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ background: cat.color }}
              />
              <span className="flex-1 text-sm truncate">{cat.name}</span>
              <div className="invisible group-hover:visible flex gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCatForm({ open: true, initial: cat })
                  }}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget({ type: 'category', item: cat })
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">{selectedCatObj?.name ?? 'All Products'}</h2>
            <p className="text-xs text-muted-foreground">{filteredProducts.length} items</p>
          </div>
          <Button
            onClick={() =>
              setProdForm({ open: true, initial: { category_id: selectedCat ?? undefined } })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products in this category"
            description="Add your first product to get started"
            action={
              <button
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                onClick={() =>
                  setProdForm({ open: true, initial: { category_id: selectedCat ?? undefined } })
                }
              >
                Add Product
              </button>
            }
          />
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {filteredProducts.map((p) => (
                <Card key={p.id} className={`p-4 ${!p.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                      {p.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className="text-lg font-bold text-primary">{fmt(p.price)}</span>
                      {(p.cost ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Cost: {fmt(p.cost ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      {p.track_inventory && (
                        <Badge
                          variant={(p.stock_quantity ?? 0) <= 5 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          Stock: {p.stock_quantity}
                        </Badge>
                      )}
                      <Badge variant={p.active ? 'success' : 'outline'} className="text-xs">
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleActive(p)}
                        className="p-1 rounded hover:bg-accent text-xs text-muted-foreground"
                      >
                        {p.active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => setProdForm({ open: true, initial: p })}
                        className="p-1.5 rounded hover:bg-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'product', item: p })}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Forms */}
      {catForm.open && (
        <CategoryForm
          initial={catForm.initial}
          onSave={handleSaveCategory}
          onClose={() => setCatForm({ open: false })}
        />
      )}
      {prodForm.open && (
        <ProductForm
          initial={prodForm.initial}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setProdForm({ open: false })}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open
          title={`Delete ${deleteTarget.type}`}
          message={`Delete "${deleteTarget.item.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
