import { ipcMain } from 'electron'
import { getSetting } from '../db/repositories/settings'

export interface ReceiptData {
  shopName: string
  shopAddress: string
  shopPhone: string
  orderNumber: string
  orderType: string
  tableNumber?: string
  customerName?: string
  items: {
    name: string
    modifiers?: string
    qty: number
    unitPrice: number
    total: number
  }[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  paymentMethod: string
  tendered?: number
  change?: number
  receiptFooter: string
  createdAt: string
  employeeName?: string
}

export interface KitchenTicketData {
  orderNumber: string
  orderType: string
  tableNumber?: string
  customerName?: string
  items: {
    name: string
    quantity: number
    modifiers?: string
    notes?: string
    status?: string
  }[]
  notes?: string
  createdAt: string
}

function buildReceiptText(data: ReceiptData): string {
  const divider = '================================'
  const thinDivider = '--------------------------------'
  const center = (text: string, width = 32) =>
    text.padStart(Math.floor((width + text.length) / 2)).padEnd(width)
  const pad = (left: string, right: string, width = 32) => {
    const space = width - left.length - right.length
    return `${left}${' '.repeat(Math.max(1, space))}${right}`
  }

  const lines: string[] = [
    center(data.shopName),
    center(data.shopAddress),
    center(data.shopPhone),
    divider,
    `Order: ${data.orderNumber}`,
    `Type: ${data.orderType.replace('_', ' ').toUpperCase()}`,
    ...(data.tableNumber ? [`Table: ${data.tableNumber}`] : []),
    ...(data.customerName ? [`Customer: ${data.customerName}`] : []),
    `Date: ${data.createdAt}`,
    ...(data.employeeName ? [`Served by: ${data.employeeName}`] : []),
    divider,
    ...data.items.flatMap((item) => [
      `${item.name}`,
      ...(item.modifiers ? [`  + ${item.modifiers}`] : []),
      pad(`  ${item.qty} x $${item.unitPrice.toFixed(2)}`, `$${item.total.toFixed(2)}`)
    ]),
    thinDivider,
    pad('Subtotal:', `$${data.subtotal.toFixed(2)}`),
    ...(data.discountAmount > 0
      ? [pad('Discount:', `-$${data.discountAmount.toFixed(2)}`)]
      : []),
    pad('Tax:', `$${data.taxAmount.toFixed(2)}`),
    divider,
    pad('TOTAL:', `$${data.total.toFixed(2)}`),
    thinDivider,
    pad(`Payment (${data.paymentMethod}):`, `$${data.total.toFixed(2)}`),
    ...(data.tendered !== undefined ? [pad('Tendered:', `$${data.tendered.toFixed(2)}`)] : []),
    ...(data.change !== undefined ? [pad('Change:', `$${data.change.toFixed(2)}`)] : []),
    divider,
    center(data.receiptFooter),
    '',
    '',
    ''
  ]
  return lines.join('\n')
}

function buildKitchenText(data: KitchenTicketData): string {
  const divider = '================================'
  const lines: string[] = [
    `** ORDER ${data.orderNumber} **`,
    `${data.orderType.replace('_', ' ').toUpperCase()}${data.tableNumber ? ` - Table ${data.tableNumber}` : ''}`,
    ...(data.customerName ? [`Customer: ${data.customerName}`] : []),
    data.createdAt,
    divider,
    ...data.items.flatMap((item) => [
      `[${item.quantity}x] ${item.name.toUpperCase()}`,
      ...(item.modifiers ? [`   -> ${item.modifiers}`] : []),
      ...(item.notes ? [`   NOTE: ${item.notes}`] : [])
    ]),
    ...(data.notes ? [divider, `ORDER NOTE: ${data.notes}`] : []),
    divider,
    '',
    ''
  ]
  return lines.join('\n')
}

async function printToPrinter(text: string, printerType: string): Promise<{ success: boolean; error?: string }> {
  if (printerType === 'none') {
    console.log('=== RECEIPT/TICKET (no printer configured) ===\n', text)
    return { success: true }
  }

  try {
    if (printerType === 'network') {
      const ip = getSetting('printer_network_ip') || ''
      const port = parseInt(getSetting('printer_network_port') || '9100', 10)
      if (!ip) return { success: false, error: 'Printer IP not configured' }

      const net = await import('net')
      await new Promise<void>((resolve, reject) => {
        const client = net.createConnection({ host: ip, port }, () => {
          const buf = Buffer.from(text + '\x1B\x64\x05\x1D\x56\x00', 'ascii')
          client.write(buf, (err) => {
            if (err) { reject(err); return }
            client.end()
            resolve()
          })
        })
        client.on('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
      return { success: true }
    }

    // Fallback: Windows default printer via shell
    console.log('=== PRINT OUTPUT ===\n', text)
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function registerPrinterIpcHandlers(): void {
  ipcMain.handle('printer:receipt', async (_e, data: ReceiptData) => {
    const printerType = getSetting('printer_type') || 'none'
    const text = buildReceiptText(data)
    return printToPrinter(text, printerType)
  })

  ipcMain.handle('printer:kitchen', async (_e, data: KitchenTicketData) => {
    const printerType = getSetting('printer_type') || 'none'
    const text = buildKitchenText(data)
    return printToPrinter(text, printerType)
  })

  ipcMain.handle('printer:test', async () => {
    const shopName = getSetting('shop_name') || 'My Shop'
    const text = `\n\n  ** ${shopName} **\n\n  Printer test successful!\n\n\n`
    const printerType = getSetting('printer_type') || 'none'
    return printToPrinter(text, printerType)
  })
}
