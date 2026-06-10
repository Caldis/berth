import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import Database from 'better-sqlite3'
import { getAssetRuntime, initAssetRuntime } from './engine/assets/runtime'
import { createSqliteSnapshotStore } from './engine/assets/sqlite-snapshot-store'
import { applyWatchEvent } from './engine/assets/watch-wiring'
import { getWatcher } from './engine/watcher'
import { resolveDefaultProjectDir } from './project-dir'
import { configureAgentDevProfile, shouldRequestSingleInstanceLock } from './dev-instance'
import { shouldAutoOpenDevTools } from './devtools'
import { createLogWriter, getMainLog, setMainLogWriter } from './log'

// GH-115 T5: 进程级兜底 — 打包应用 (无终端) 的故障此前零痕迹。日志仅落
// userData/logs 本地滚动文件 (无遥测硬边界); uncaughtException 弹框告知后不强退
// (只读查看器, 残余状态无写副作用风险)。
function installProcessGuards(): void {
  setMainLogWriter(createLogWriter(join(app.getPath('userData'), 'logs')))
  process.on('uncaughtException', (err) => {
    getMainLog().log('uncaught-exception', err)
    dialog.showErrorBox('Berth encountered an error', err?.stack ?? String(err))
  })
  process.on('unhandledRejection', (reason) => {
    getMainLog().log('unhandled-rejection', reason)
  })
  app.on('render-process-gone', (_event, _contents, details) => {
    getMainLog().log('render-process-gone', `${details.reason} (exitCode=${details.exitCode})`)
  })
}

type CreateWindowOptions = {
  openDevTools?: boolean
}

function createWindow(options: CreateWindowOptions = {}): BrowserWindow {
  const isWindows = process.platform === 'win32'
  const isMacOS = process.platform === 'darwin'

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    ...(isWindows
      ? {
          frame: false,
          titleBarStyle: 'hidden' as const
        }
      : {}),
    ...(isMacOS
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 16, y: 16 }
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isWindows) {
    mainWindow.setMenu(null)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (options.openDevTools) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'undocked' })
    })
  }

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
const agentDevProfile = configureAgentDevProfile(app, {
  isDev: is.dev,
  argv: process.argv,
  env: process.env
})
const gotTheLock = shouldRequestSingleInstanceLock(agentDevProfile)
  ? app.requestSingleInstanceLock()
  : true
const openDevTools = shouldAutoOpenDevTools({
  isDev: is.dev,
  rendererUrl: process.env['ELECTRON_RENDERER_URL'],
  isAgentDev: Boolean(agentDevProfile)
})

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

  installProcessGuards()

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.berth.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerAllHandlers()

    // Initialize the asset engine
    const projectDir = resolveDefaultProjectDir({ isDev: is.dev, cwd: process.cwd() })
    // Seed the runtime with the persisted snapshot (GH-113 I3): cold start shows
    // the last result instantly from the on-disk SQLite index, then the renderer
    // triggers a background refresh (SWR). better-sqlite3's Electron-ABI binding
    // loads only here in the main process — never in the unit-test host.
    initAssetRuntime({
      projectDir,
      snapshotStore: createSqliteSnapshotStore(app.getPath('userData'), (file) => new Database(file))
    })
    const watcher = getWatcher()

    createWindow({ openDevTools })
    // GH-113 I1: a file change re-derives just that file's assets and folds them
    // into the live snapshot incrementally — no full rescan (applyWatchEvent). The
    // primary update reaches the renderer via the progress channel (the partial
    // emitted by applyFileChange). The 'assets:changed' signal additionally lets
    // non-progress consumers — health checks + the snapshot-sync fallback — re-
    // evaluate against the UPDATED snapshot with a SOFT refresh (no extra full
    // rescan), which the incremental path would otherwise leave stale.
    watcher.setErrorListener((err) => {
      // chokidar 'error' 此前无监听者: 直冲 uncaughtException 且 live 更新静默失效 (GH-115 T5)
      getMainLog().log('watcher', err)
    })
    // Push channels broadcast to every live window: a closure over the first
    // window goes stale after macOS dock re-activate recreates it (the new
    // window would silently miss incremental updates).
    watcher.setListener((event) => {
      applyWatchEvent(event, getAssetRuntime())
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('assets:changed', event)
      }
    })
    watcher.start(projectDir)

    // Stream live scan status + already-scanned assets to the renderer (P4.6).
    getAssetRuntime().setProgressListener((payload) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('assets:progress', payload)
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow({ openDevTools })
    })
  }).catch((err: unknown) => {
    // 启动期 throw 此前表现为 dock 图标出现但永远无窗口、零诊断 (GH-115 T5)
    getMainLog().log('startup', err)
    dialog.showErrorBox('Berth failed to start', err instanceof Error ? (err.stack ?? err.message) : String(err))
    app.exit(1)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

