import { useEffect } from 'react'
import { useSettingsStore } from '../store'
import type { AppSettings } from '../types'

export function useSettings(): AppSettings | null {
  const { settings, loaded, setSettings } = useSettingsStore()

  useEffect(() => {
    if (!loaded) {
      window.api.settings.getAll().then((s) => {
        setSettings(s as unknown as AppSettings)
        // Apply theme
        if ((s as unknown as AppSettings).theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      })
    }
  }, [loaded, setSettings])

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
