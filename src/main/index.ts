import { app, BrowserWindow, shell, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.berth.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function registerIpcHandlers(): void {
  ipcMain.handle('platform:info', () => ({
    platform: process.platform,
    arch: process.arch,
    homeDir: app.getPath('home'),
    version: app.getVersion()
  }))

  ipcMain.handle('theme:get', () => nativeTheme.themeSource)

  ipcMain.handle('theme:set', (_, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('shell:openPath', (_, path: string) => {
    shell.showItemInFolder(path)
  })

  ipcMain.handle('shell:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })
}
