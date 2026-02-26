import { useEffect } from 'react'
import { useSettingsStore } from '../store'
import type { AppSettings } from '../types'

function applyTheme(theme: string | undefined): void {
  const t = theme ?? 'system'
  let isDark: boolean
  if (t === 'dark') {
    isDark = true
  } else if (t === 'light') {
    isDark = false
  } else {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.classList.toggle('dark', isDark)
}

export function useSettings(): AppSettings | null {
  const { settings, loaded, setSettings } = useSettingsStore()

  useEffect(() => {
    if (!loaded) {
      window.api.settings.getAll().then((s) => {
        setSettings(s as unknown as AppSettings)
        applyTheme((s as unknown as AppSettings).theme)
      })
    }
  }, [loaded, setSettings])

  // Reactively re-apply theme whenever the stored setting changes
  useEffect(() => {
    applyTheme(settings?.theme)
  }, [settings?.theme])

  // Also respond to system colour-scheme changes when theme === 'system'
  useEffect(() => {
    if (settings?.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings?.theme])

  return settings
}

export function useCurrency(): (amount: number) => string {
  const settings = useSettingsStore((s) => s.settings)
  const symbol = settings?.currency_symbol ?? '$'
  return (amount: number) => `${symbol}${amount.toFixed(2)}`
}

export function useTaxRate(): { rate: number; inclusive: boolean } {
  const settings = useSettingsStore((s) => s.settings)
  return {
    rate: parseFloat(settings?.tax_rate ?? '8'),
    inclusive: settings?.tax_inclusive === 'true'
  }
}
