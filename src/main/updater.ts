import type { UpdatePreferences, UpdateState } from '@shared/types/ipc'

/**
 * GH-124: auto-update controller. Every dependency is injected (the real
 * `autoUpdater` from electron-updater, platform, prefs, the broadcast emitter,
 * the logger), so this module stays electron-free and the full state machine is
 * directly testable with a fake updater.
 *
 * Unsigned-macOS degradation (electron-builder: "macOS application must be
 * signed in order for auto updating to work"): checking still works (it only
 * fetches latest-mac.yml), download/install are refused with platformLimited —
 * the UI routes the user to the releases page instead. Lift the branch once
 * the signing issue is resolved.
 */
export interface UpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  forceDevUpdateConfig: boolean
  on(event: string, listener: (...args: never[]) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
}

export interface UpdaterControllerOptions {
  autoUpdater: UpdaterLike
  platform: NodeJS.Platform
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
  const { autoUpdater, platform, isPackaged, emit, log } = options
  const limited = platform === 'darwin'
  const withLimit = (state: UpdateState): UpdateState =>
    limited ? { ...state, platformLimited: true } : state

  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoDownload = !limited && options.preferences.autoDownload
  if (!isPackaged) autoUpdater.forceDevUpdateConfig = true

  autoUpdater.on('checking-for-update', () => emit(withLimit({ phase: 'checking' })))
  autoUpdater.on('update-available', (...args: never[]) => {
    const info = args[0] as { version?: string; releaseNotes?: unknown } | undefined
    emit(withLimit({
      phase: 'available',
      version: info?.version,
      notes: typeof info?.releaseNotes === 'string' ? info.releaseNotes.slice(0, 2000) : undefined
    }))
  })
  autoUpdater.on('update-not-available', () => emit(withLimit({ phase: 'not-available' })))
  autoUpdater.on('download-progress', (...args: never[]) => {
    const progress = args[0] as { percent?: number } | undefined
    emit(withLimit({ phase: 'downloading', percent: Math.round(progress?.percent ?? 0) }))
  })
  autoUpdater.on('update-downloaded', (...args: never[]) => {
    const info = args[0] as { version?: string } | undefined
    emit(withLimit({ phase: 'downloaded', version: info?.version }))
  })
  autoUpdater.on('error', (...args: never[]) => {
    const err = args[0] as Error | undefined
    log('updater', err)
    emit(withLimit({ phase: 'error', error: err?.message ?? String(err) }))
  })

  return {
    async check(): Promise<void> {
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        // The 'error' listener above usually fires too; this catch covers
        // rejections raised before the event wiring (e.g. unsigned-mac init).
        log('updater', error)
        emit(withLimit({ phase: 'error', error: error instanceof Error ? error.message : String(error) }))
      }
    },
    async download(): Promise<void> {
      if (limited) {
        emit({ phase: 'available', platformLimited: true })
        return
      }
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        log('updater', error)
        emit(withLimit({ phase: 'error', error: error instanceof Error ? error.message : String(error) }))
      }
    },
    install(): void {
      if (limited) {
        emit({ phase: 'downloaded', platformLimited: true })
        return
      }
      autoUpdater.quitAndInstall()
    },
    applyPreferences(prefs: UpdatePreferences): void {
      autoUpdater.autoDownload = !limited && prefs.autoDownload
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
