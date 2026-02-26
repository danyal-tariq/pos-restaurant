import { useState, useEffect } from 'react'

export interface ToastItem {
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
