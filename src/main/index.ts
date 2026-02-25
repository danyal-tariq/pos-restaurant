import { app, shell, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getDatabase } from './db/database'
import { registerDbIpcHandlers } from './ipc/db.ipc'
import { registerPrinterIpcHandlers } from './ipc/printer.ipc'

let mainWindow: BrowserWindow | null = null
let kitchenWindow: BrowserWindow | null = null
let customerWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    kitchenWindow?.close()
    customerWindow?.close()
  })
}

function createKitchenWindow(): BrowserWindow {
  const displays = screen.getAllDisplays()
  const targetDisplay = displays[1] ?? displays[0]
  const { x, y, width, height } = targetDisplay.bounds

  kitchenWindow = new BrowserWindow({
    x: x + 10,
    y: y + 10,
    width: width - 20,
    height: height - 20,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    icon,
    title: 'Kitchen Display',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  kitchenWindow.on('ready-to-show', () => kitchenWindow?.show())

  const url = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? `${process.env['ELECTRON_RENDERER_URL']}#/kitchen`
    : join(__dirname, '../renderer/index.html')
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    kitchenWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/kitchen`)
  } else {
    kitchenWindow.loadFile(url, { hash: 'kitchen' })
  }

  kitchenWindow.on('closed', () => { kitchenWindow = null })

  return kitchenWindow
}

function createCustomerWindow(): BrowserWindow {
  const displays = screen.getAllDisplays()
  const targetDisplay = displays[2] ?? displays[1] ?? displays[0]
  const { x, y, width, height } = targetDisplay.bounds

  customerWindow = new BrowserWindow({
    x: x + 10,
    y: y + 10,
    width: width - 20,
    height: height - 20,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon,
    title: 'Customer Display',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  customerWindow.on('ready-to-show', () => customerWindow?.show())

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    customerWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/customer-display`)
  } else {
    customerWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'customer-display'
    })
  }

  customerWindow.on('closed', () => { customerWindow = null })

  return customerWindow
}

function setupTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  const menu = Menu.buildFromTemplate([
    { label: 'Show POS', click: () => mainWindow?.show() },
    { label: 'Kitchen Display', click: () => { if (!kitchenWindow) createKitchenWindow(); else kitchenWindow.show() } },
    { label: 'Customer Display', click: () => { if (!customerWindow) createCustomerWindow(); else customerWindow.show() } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setToolTip('Restaurant POS')
  tray.setContextMenu(menu)
  tray.on('double-click', () => mainWindow?.show())
}

// Window management IPC
function registerWindowHandlers(): void {
  ipcMain.handle('window:openKitchen', () => {
    if (!kitchenWindow || kitchenWindow.isDestroyed()) createKitchenWindow()
    else kitchenWindow.show()
    return true
  })
  ipcMain.handle('window:openCustomer', () => {
    if (!customerWindow || customerWindow.isDestroyed()) createCustomerWindow()
    else customerWindow.show()
    return true
  })
  ipcMain.handle('window:closeKitchen', () => {
    kitchenWindow?.close()
    return true
  })
  ipcMain.handle('window:closeCustomer', () => {
    customerWindow?.close()
    return true
  })

  // Customer display: push cart state from renderer
  ipcMain.handle('customer:updateCart', (_e, cartData) => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('display:updateCart', cartData)
    }
    return true
  })
  ipcMain.handle('customer:showPayment', (_e, paymentData) => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('display:showPayment', paymentData)
    }
    return true
  })
  ipcMain.handle('customer:clearDisplay', () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('display:clear')
    }
    return true
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pos.restaurant')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialise database
  getDatabase()

  // Register all IPC handlers
  registerDbIpcHandlers()
  registerPrinterIpcHandlers()
  registerWindowHandlers()

  createMainWindow()
  setupTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
