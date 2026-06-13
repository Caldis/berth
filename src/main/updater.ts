import type { UpdatePreferences, UpdateState } from '@shared/types/ipc'

/**
 * GH-124/GH-134: auto-update controller. Every dependency is injected (the real
 * `autoUpdater` from electron-updater, prefs, the broadcast emitter, the logger),
 * so this module stays electron-free and the full state machine is directly
 * testable with a fake updater.
 *
 * GH-134: macOS is now signed + notarized, so it auto-updates like win/linux.
 * The earlier unsigned-macOS degradation (platformLimited / releases-page link)
 * has been lifted — all platforms run real download/install.
 */
export interface UpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  forceDevUpdateConfig: boolean
  on(event: string, listener: (...args: never[]) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
}

export interface UpdaterControllerOptions {
  autoUpdater: UpdaterLike
  isPackaged: boolean
  preferences: UpdatePreferences
  emit: (state: UpdateState) => void
  log: (scope: string, payload: unknown) => void
}

export interface UpdaterController {
  check(): Promise<void>
  download(): Promise<void>
  install(): void
  applyPreferences(prefs: UpdatePreferences): void
}

export function createUpdaterController(options: UpdaterControllerOptions): UpdaterController {
  const { autoUpdater, isPackaged, emit, log } = options

  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoDownload = options.preferences.autoDownload
  // allowPrerelease (beta channel) only changes which GitHub releases `check`
  // considers.
  autoUpdater.allowPrerelease = options.preferences.allowPrerelease
  if (!isPackaged) autoUpdater.forceDevUpdateConfig = true

  autoUpdater.on('checking-for-update', () => emit({ phase: 'checking' }))
  autoUpdater.on('update-available', (...args: never[]) => {
    const info = args[0] as { version?: string; releaseNotes?: unknown } | undefined
    emit({
      phase: 'available',
      version: info?.version,
      notes: typeof info?.releaseNotes === 'string' ? info.releaseNotes.slice(0, 2000) : undefined
    })
  })
  autoUpdater.on('update-not-available', () => emit({ phase: 'not-available' }))
  autoUpdater.on('download-progress', (...args: never[]) => {
    const progress = args[0] as { percent?: number } | undefined
    emit({ phase: 'downloading', percent: Math.round(progress?.percent ?? 0) })
  })
  autoUpdater.on('update-downloaded', (...args: never[]) => {
    const info = args[0] as { version?: string } | undefined
    emit({ phase: 'downloaded', version: info?.version })
  })
  autoUpdater.on('error', (...args: never[]) => {
    const err = args[0] as Error | undefined
    log('updater', err)
    emit({ phase: 'error', error: err?.message ?? String(err) })
  })

  return {
    async check(): Promise<void> {
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        // The 'error' listener above usually fires too; this catch covers
        // rejections raised before the event wiring.
        log('updater', error)
        emit({ phase: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },
    async download(): Promise<void> {
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        log('updater', error)
        emit({ phase: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },
    install(): void {
      autoUpdater.quitAndInstall()
    },
    applyPreferences(prefs: UpdatePreferences): void {
      autoUpdater.autoDownload = prefs.autoDownload
      autoUpdater.allowPrerelease = prefs.allowPrerelease
    }
  }
}

/**
 * Host wiring (set once in src/main/index.ts after whenReady). The IPC handlers
 * resolve it lazily per call, so registerAllHandlers() stays parameterless and
 * the registration↔contract reconciliation test runs without electron-updater.
 */
export interface UpdaterRuntime {
  controller: UpdaterController
  userDataDir: string
}

let updaterRuntime: UpdaterRuntime | null = null

export function setUpdaterRuntime(runtime: UpdaterRuntime): void {
  updaterRuntime = runtime
}

export function getUpdaterRuntime(): UpdaterRuntime | null {
  return updaterRuntime
}
