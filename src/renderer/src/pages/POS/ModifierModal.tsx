import React, { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/index'
import { cn } from '../../lib/utils'
import type { Product, ModifierGroup } from '../../types'

interface ModifierModalProps {
  product: Product
  groups: ModifierGroup[]
  onConfirm: (
    product: Product,
    modifiers: { modifier_id: number; name: string; price_delta: number }[]
  ) => void
  onClose: () => void
  fmt: (n: number) => string
}

export function ModifierModal({ product, groups, onConfirm, onClose, fmt }: ModifierModalProps): JSX.Element {
  const [selected, setSelected] = useState<Record<number, number[]>>({})

  const toggleModifier = (groupId: number, modId: number, multiSelect: boolean): void => {
    setSelected((prev) => {
      const current = prev[groupId] ?? []
      if (multiSelect) {
        return {
          ...prev,
          [groupId]: current.includes(modId)
            ? current.filter((id) => id !== modId)
            : [...current, modId]
        }
      } else {
        return { ...prev, [groupId]: current.includes(modId) ? [] : [modId] }
      }
    })
  }

  const canConfirm = groups.every((g) => {
    if (!g.required) return true
    const sel = selected[g.id] ?? []
    return sel.length >= (g.min_select || 1)
  })

  const handleConfirm = (): void => {
    const modifiers: { modifier_id: number; name: string; price_delta: number }[] = []
    for (const group of groups) {
      const selIds = selected[group.id] ?? []
      for (const modId of selIds) {
        const mod = group.modifiers?.find((m) => m.id === modId)
        if (mod) {
          modifiers.push({ modifier_id: mod.id, name: mod.name, price_delta: mod.price_delta })
        }
      }
    }
    onConfirm(product, modifiers)
  }

  const totalExtra = groups.reduce((acc, g) => {
    return acc + (selected[g.id] ?? []).reduce((a2, modId) => {
      const mod = g.modifiers?.find((m) => m.id === modId)
      return a2 + (mod?.price_delta ?? 0)
    }, 0)
  }, 0)

  return (
    <Modal open onClose={onClose} title={product.name} size="md">
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted-foreground">Base price: {fmt(product.price)}</p>
        {groups.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{group.name}</h4>
              {group.required ? (
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Required</span>
              ) : (
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">Optional</span>
              )}
              {group.multi_select && (
                <span className="text-xs text-muted-foreground">Multi-select</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(group.modifiers ?? []).map((mod) => {
                const isSelected = (selected[group.id] ?? []).includes(mod.id)
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(group.id, mod.id, !!group.multi_select)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:border-primary/50 hover:bg-accent/50'
                    )}
                  >
                    <span>{mod.name}</span>
                    {mod.price_delta !== 0 && (
                      <span className="font-medium">
                        {mod.price_delta > 0 ? '+' : ''}{fmt(mod.price_delta)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Total price</p>
            <p className="text-xl font-bold text-primary">{fmt(product.price + totalExtra)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
