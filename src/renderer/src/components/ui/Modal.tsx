/* eslint-disable prettier/prettier */
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl'
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = 'md'
}: ModalProps): JSX.Element | null {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        className={cn(
          'w-full rounded-xl bg-card shadow-2xl border border-border animate-in fade-in-0 zoom-in-95',
          sizeMap[size],
          className
        )}
        role="dialog"
      >
        {title && (
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className={cn('overflow-y-auto max-h-[85vh]', title ? '' : 'rounded-xl')}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  if (!open) return null
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border hover:bg-accent text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium text-white',
              destructive
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-primary hover:bg-primary/90'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── PIN Input ─────────────────────────────────────────────────────────────────
interface PinInputProps {
  length?: number
  onComplete: (pin: string) => void
  title?: string
  error?: string
  onClear?: () => void
}

export function PinInput({
  length = 4,
  onComplete,
  title = 'Enter PIN',
  error,
  onClear
}: PinInputProps): JSX.Element {
  const [pin, setPin] = useState('')

  const handleDigit = (d: string): void => {
    const next = pin + d
    if (next.length <= length) {
      setPin(next)
      if (next.length === length) {
        setTimeout(() => {
          onComplete(next)
          setPin('')
        }, 100)
      }
    }
  }

  const handleBackspace = (): void => setPin((p) => p.slice(0, -1))

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-all',
              i < pin.length ? 'bg-primary border-primary' : 'border-muted-foreground'
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((b, i) =>
          b === '' ? (
            <div key={i} />
          ) : b === '⌫' ? (
            <button
              key={i}
              onClick={handleBackspace}
              className="h-14 w-14 rounded-xl bg-secondary hover:bg-secondary/80 text-lg font-bold transition-colors"
            >
              ⌫
            </button>
          ) : (
            <button
              key={i}
              onClick={() => handleDigit(b)}
              className="h-14 w-14 rounded-xl bg-secondary hover:bg-secondary/80 text-xl font-bold transition-colors active:scale-95"
            >
              {b}
            </button>
          )
        )}
      </div>
      {onClear && (
        <button
          onClick={() => {
            setPin('')
            onClear()
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectOption {
  label: string
  value: string
}
interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className
}: SelectProps): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ── Toast Notification ────────────────────────────────────────────────────────
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}
export function Toast({ message, type = 'info', onClose }: ToastProps): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-green-600',
    error: 'bg-destructive',
    info: 'bg-primary'
  }

  return createPortal(
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg',
        'animate-in slide-in-from-bottom-4',
        colors[type]
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>,
    document.body
  )
}

// Simple hook for toasts
interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}
let toastIdCounter = 0
const listeners: Set<(toasts: ToastItem[]) => void> = new Set()
let toasts: ToastItem[] = []

function notifyListeners(): void {
  listeners.forEach((l) => l([...toasts]))
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const id = ++toastIdCounter
  toasts = [...toasts, { id, message, type }]
  notifyListeners()
}

export function useToasts(): { toasts: ToastItem[]; dismiss: (id: number) => void } {
  const [t, setT] = useState<ToastItem[]>(toasts)
  useEffect(() => {
    listeners.add(setT)
    return () => {
      listeners.delete(setT)
    }
  }, [])
  const dismiss = (id: number): void => {
    toasts = toasts.filter((tt) => tt.id !== id)
    notifyListeners()
  }
  return { toasts: t, dismiss }
}
