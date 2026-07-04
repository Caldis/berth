import { app, BrowserWindow, dialog, powerMonitor, session, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAllHandlers } from './ipc'
import Database from 'better-sqlite3'
import { getAssetRuntime, initAssetRuntime } from '@berth/scan-engine/engine/assets/runtime'
import { createSqliteSnapshotStore } from '@berth/scan-engine/engine/assets/sqlite-snapshot-store'
import { applyWatchEvent } from '@berth/scan-engine/engine/assets/watch-wiring'
import { TrailingCoalescer } from '@berth/scan-engine/engine/assets/trailing-coalescer'
import type { WatchEvent } from '@berth/scan-engine/shared/types/asset'
import { getWatcher } from '@berth/scan-engine/engine/watcher'
import { resolveDefaultProjectDir } from './project-dir'
import { configureAgentDevProfile, shouldRequestSingleInstanceLock } from './dev-instance'
import { shouldAutoOpenDevTools } from './devtools'
import { createLogWriter, getMainLog, setMainLogWriter } from '@berth/scan-engine/log'
import { isAllowedPermission, isSafeExternalUrl } from './url-guard'
import { autoUpdater } from 'electron-updater'
import { createUpdaterController, setUpdaterRuntime } from './updater'
import { readUpdatePreferences } from './update-preferences'
import { createScanEngineSettingsStore } from './scan-engine-settings'
import { HelperAssetScanner, getScanHelperHost } from './helper-host'
import appIcon from '../../assets/icon/app_icon.png?asset'

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
    // 窗口/任务栏图标 (win 生效, linux 必需; mac 忽略 — 包图标走 electron-builder mac.icon)
    ...(isMacOS ? {} : { icon: appIcon }),
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
      // GH-119: preload is pure contextBridge+ipcRenderer and ships with
      // @electron-toolkit/preload bundled (electron.vite.config preload
      // exclude), so the Electron 20+ default sandbox applies cleanly.
      sandbox: true,
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
    if (isSafeExternalUrl(details.url)) {
      setImmediate(() => {
        void shell.openExternal(details.url)
      })
    } else {
      getMainLog().log('url-guard', `denied window-open: ${details.url}`)
    }
    return { action: 'deny' }
  })

  // GH-119: MemoryRouter does no real navigation, so no legitimate top-level
  // navigation exists in prod — block everything (a dropped file would
  // otherwise replace the SPA with file:// content). Dev allows same-origin
  // only: vite's full reload goes through will-navigate via location.reload().
  const devOrigin =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? new URL(process.env['ELECTRON_RENDERER_URL']).origin
      : null
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    let allowed = false
    if (devOrigin) {
      try {
        allowed = new URL(navigationUrl).origin === devOrigin
      } catch {
        allowed = false
      }
    }
    if (!allowed) {
      event.preventDefault()
      getMainLog().log('url-guard', `denied navigation: ${navigationUrl}`)
    }
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

    // GH-119: deny-all permission policy except the explicit allow-list
    // (clipboard-sanitized-write backs the renderer copy buttons). Request and
    // check handlers share one predicate so query/request never disagree; the
    // check handler stays silent (synchronous, potentially hot path).
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = isAllowedPermission(permission)
      if (!allowed) getMainLog().log('url-guard', `denied permission request: ${permission}`)
      callback(allowed)
    })
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      return isAllowedPermission(permission)
    })

    // Initialize the asset engine
    const projectDir = resolveDefaultProjectDir({ isDev: is.dev, cwd: process.cwd() })
    // Seed the runtime with the persisted snapshot (GH-113 I3): cold start shows
    // the last result instantly from the on-disk SQLite index, then the renderer
    // triggers a background refresh (SWR). better-sqlite3's Electron-ABI binding
    // loads only here in the main process — never in the unit-test host.
    const userDataDir = app.getPath('userData')
    // GH-135 B3: track battery state for the periodic-scan power gate.
    let onBatteryPower = false
    powerMonitor.on('on-battery', () => {
      onBatteryPower = true
    })
    powerMonitor.on('on-ac', () => {
      onBatteryPower = false
    })
    // Hoisted so before-quit can checkpoint + close it (GH-152 T5).
    const snapshotStore = createSqliteSnapshotStore(userDataDir, (file) => new Database(file))
    initAssetRuntime({
      projectDir,
      // GH-135: scanning runs in a long-lived utilityProcess helper for OS-level
      // throttle + crash/memory isolation + a real kill(). The engine's runtime
      // stays the single source of truth in main; only the scan executor is the
      // separate process. (方案 X) The engine package keeps WorkerAssetScanner
      // (worker_threads) as its electron-free default for the CLI.
      createScanner: (dir) => new HelperAssetScanner(dir),
      snapshotStore,
      settingsStore: createScanEngineSettingsStore(userDataDir),
      // GH-135 B3: power/idle signals for periodic-scan gating (engine stays electron-free).
      powerMonitor: {
        getSystemIdleTimeMs: () => powerMonitor.getSystemIdleTime() * 1000,
        onBatteryPower: () => onBatteryPower
      }
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
    // GH-151 S7: the BROADCAST is coalesced (every renderer subscriber re-queries
    // per event, so a burst quadruples into snapshot+health+insights+engineInfo
    // refetches); applyWatchEvent stays per-event — incremental derivation must
    // see every file.
    const changedCoalescer = new TrailingCoalescer<WatchEvent>((event) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('assets:changed', event)
      }
    })
    watcher.setListener((event) => {
      applyWatchEvent(event, getAssetRuntime())
      changedCoalescer.push(event)
    })
    watcher.start(projectDir)

    // Stream live scan status + already-scanned assets to the renderer (P4.6).
    getAssetRuntime().setProgressListener((payload) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('assets:progress', payload)
      }
    })

    // GH-135 B3: start the periodic full-rescan scheduler (idle/power-gated).
    getAssetRuntime().schedulePeriodic()

    // GH-135: terminate the scan helper before the app exits. Electron auto-kills
    // utilityProcess children, but kill explicitly so it never lingers.
    // GH-152 T5 ordering: cancel FIRST so the killed helper's rejection lands in
    // the coordinator's cancelled branch (quitting used to record a bogus failed
    // entry in scan history), then kill, then checkpoint+close the store so the
    // WAL doesn't ride out the process.
    app.on('before-quit', () => {
      changedCoalescer.dispose()
      getAssetRuntime().cancel()
      getScanHelperHost().kill()
      snapshotStore.close?.()
    })

    // GH-135 C2: surface helper crashes/OOM (parentPort has no 'close' event). The
    // host respawns on the next scan; this only logs the cause for diagnosis.
    app.on('child-process-gone', (_event, details) => {
      if (details.type === 'Utility' && details.serviceName === 'berth-scan-helper' && details.reason !== 'clean-exit') {
        getMainLog().log('scan-helper', `helper gone: ${details.reason} (exit ${String(details.exitCode)}); respawns on next scan`)
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow({ openDevTools })
    })

    // GH-124: auto-update wiring. The controller is electron-free (deps
    // injected); state broadcasts to every live window like assets:progress.
    const updatePreferences = readUpdatePreferences(userDataDir)
    const updaterController = createUpdaterController({
      autoUpdater,
      isPackaged: app.isPackaged,
      preferences: updatePreferences,
      emit: (state) => {
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) win.webContents.send('update:state', state)
        }
      },
      log: (scope, payload) => getMainLog().log(scope, payload)
    })
    setUpdaterRuntime({ controller: updaterController, userDataDir })
    // Deferred startup check, gated by the autoCheck preference (GH-134); never
    // blocks launch; failures surface as update:state error (and the main log).
    if (updatePreferences.autoCheck) {
      setTimeout(() => { void updaterController.check() }, 5000)
    }
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

