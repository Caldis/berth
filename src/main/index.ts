import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import { initScanner } from './engine/scanner'
import { getWatcher } from './engine/watcher'
import { resolveDefaultProjectDir } from './project-dir'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'win32'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#64748b',
            height: 36
          }
        }
      : {}),
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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

  return mainWindow
}

// Enforce a single running instance. A second launch (double-clicking the app,
// or re-running `pnpm dev` without killing the previous one) fails to acquire
// the lock and quits immediately, focusing the existing window instead of
// opening a duplicate. Prevents the multi-window issue in dev and production.
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const existing = BrowserWindow.getAllWindows()[0]
    if (existing) {
      if (existing.isMinimized()) existing.restore()
      existing.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.berth.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerAllHandlers()

    // Initialize the asset engine
    const projectDir = resolveDefaultProjectDir({ isDev: is.dev, cwd: process.cwd() })
    initScanner(projectDir)
    const watcher = getWatcher()

    const mainWindow = createWindow()
    watcher.setWindow(mainWindow)
    watcher.start(projectDir)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

