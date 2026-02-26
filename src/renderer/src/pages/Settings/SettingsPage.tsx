import { useState, useEffect } from 'react'
import { Button, Input, Label, Spinner, Card } from '../../components/ui/index'
import { showToast } from '../../components/ui/toast'
import { useSettingsStore } from '../../store'
import type { AppSettings } from '../../types'
import { Save, Printer, Store, CreditCard, Monitor } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'INR', 'PKR', 'CAD', 'AUD']

interface FieldProps {
  label: string
  children: React.ReactNode
  hint?: string
}
function Field({ label, children, hint }: FieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SettingsPage(): JSX.Element {
  const { setSettings } = useSettingsStore()
  const [local, setLocal] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [printerTest, setPrinterTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')

  useEffect(() => {
    window.api.settings.getAll().then((s) => {
      setLocal(s as Record<string, string>)
    })
  }, [])

  const set = (key: string, val: string): void => setLocal((prev) => ({ ...prev, [key]: val }))

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    await window.api.settings.set(local)
    setSettings(local as unknown as AppSettings)
    showToast('Settings saved', 'success')
    setSaving(false)
  }

  const handleTestPrint = async (): Promise<void> => {
    setPrinterTest('testing')
    try {
      await window.api.printer.test()
      setPrinterTest('ok')
    } catch {
      setPrinterTest('fail')
    }
    setTimeout(() => setPrinterTest('idle'), 3000)
  }

  const sections = [
    {
      id: 'shop',
      title: 'Shop Information',
      icon: <Store className="h-4 w-4" />,
      fields: (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Shop Name">
            <Input
              value={local['shop_name'] ?? ''}
              onChange={(e) => set('shop_name', e.target.value)}
              placeholder="My Restaurant"
            />
          </Field>
          <Field label="Phone Number">
            <Input
              value={local['shop_phone'] ?? ''}
              onChange={(e) => set('shop_phone', e.target.value)}
              placeholder="+1 234 567 890"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Input
                value={local['shop_address'] ?? ''}
                onChange={(e) => set('shop_address', e.target.value)}
                placeholder="123 Main Street, City"
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Receipt Footer Message">
              <Input
                value={local['receipt_footer'] ?? ''}
                onChange={(e) => set('receipt_footer', e.target.value)}
                placeholder="Thank you! We hope to see you again."
              />
            </Field>
          </div>
        </div>
      )
    },
    {
      id: 'tax',
      title: 'Tax & Currency',
      icon: <CreditCard className="h-4 w-4" />,
      fields: (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tax Rate (%)" hint="Enter 0 to disable tax">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={local['tax_rate'] ?? '0'}
              onChange={(e) => set('tax_rate', e.target.value)}
            />
          </Field>
          <Field label="Tax Inclusive" hint="Is tax already included in prices?">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['tax_inclusive'] ?? 'false'}
              onChange={(e) => set('tax_inclusive', e.target.value)}
            >
              <option value="false">Exclusive (added on top)</option>
              <option value="true">Inclusive (included in price)</option>
            </select>
          </Field>
          <Field label="Currency">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['currency'] ?? 'USD'}
              onChange={(e) => set('currency', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency Symbol">
            <Input
              value={local['currency_symbol'] ?? '$'}
              onChange={(e) => set('currency_symbol', e.target.value)}
              placeholder="$"
            />
          </Field>
          <Field label="Order Number Prefix">
            <Input
              value={local['order_prefix'] ?? 'ORD'}
              onChange={(e) => set('order_prefix', e.target.value)}
              placeholder="ORD"
            />
          </Field>
        </div>
      )
    },
    {
      id: 'printer',
      title: 'Receipt Printer',
      icon: <Printer className="h-4 w-4" />,
      fields: (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Printer Type">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['printer_type'] ?? 'network'}
              onChange={(e) => set('printer_type', e.target.value)}
            >
              <option value="network">Network (TCP/IP)</option>
              <option value="none">None (no printing)</option>
            </select>
          </Field>
          <Field label="Printer IP Address" hint="e.g. 192.168.1.100">
            <Input
              value={local['printer_ip'] ?? ''}
              onChange={(e) => set('printer_ip', e.target.value)}
              placeholder="192.168.1.100"
            />
          </Field>
          <Field label="Printer Port" hint="Usually 9100">
            <Input
              type="number"
              value={local['printer_port'] ?? '9100'}
              onChange={(e) => set('printer_port', e.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleTestPrint}
              disabled={printerTest === 'testing'}
              className="w-full"
            >
              <Printer className="h-4 w-4 mr-2" />
              {printerTest === 'idle'
                ? 'Test Print'
                : printerTest === 'testing'
                  ? 'Testing...'
                  : printerTest === 'ok'
                    ? '✓ Success!'
                    : '✗ Failed'}
            </Button>
          </div>
          <Field label="Paper Width" hint="columns">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['paper_width'] ?? '80'}
              onChange={(e) => set('paper_width', e.target.value)}
            >
              <option value="58">58mm (~32 cols)</option>
              <option value="80">80mm (~42 cols)</option>
            </select>
          </Field>
        </div>
      )
    },
    {
      id: 'display',
      title: 'Display & Appearance',
      icon: <Monitor className="h-4 w-4" />,
      fields: (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Theme">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['theme'] ?? 'system'}
              onChange={(e) => set('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </Field>
          <Field label="Language">
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={local['language'] ?? 'en'}
              onChange={(e) => set('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </Field>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="p-6 space-y-6 max-w-3xl">
        {sections.map((s) => (
          <Card key={s.id} className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{s.icon}</div>
              <h2 className="font-bold">{s.title}</h2>
            </div>
            {s.fields}
          </Card>
        ))}
      </div>
    </div>
  )
}
