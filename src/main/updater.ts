import type { UpdatePreferences, UpdateReleaseNote, UpdateState } from '@shared/types/ipc'

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
  fullChangelog: boolean
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
  check(options?: { userInitiated?: boolean }): Promise<void>
  download(): Promise<void>
  install(): void
  applyPreferences(prefs: UpdatePreferences): void
}

/** IPC payload bounds for release notes (GH-156). */
const MAX_RELEASE_NOTE_ENTRIES = 20
const MAX_RELEASE_NOTE_CHARS = 4000

/** electron-updater hands over `string` (single release) or `ReleaseNoteInfo[]`
 * (fullChangelog). Normalize both into bounded entries; empty notes drop out. */
function normalizeReleaseNotes(fallbackVersion: string | undefined, raw: unknown): UpdateReleaseNote[] | undefined {
  if (typeof raw === 'string') {
    const note = raw.slice(0, MAX_RELEASE_NOTE_CHARS)
    return note.length > 0 ? [{ version: fallbackVersion ?? '', note }] : undefined
  }
  if (!Array.isArray(raw)) return undefined
  const entries: UpdateReleaseNote[] = []
  for (const item of raw) {
    if (entries.length >= MAX_RELEASE_NOTE_ENTRIES) break
    if (typeof item !== 'object' || item === null) continue
    const { version, note } = item as { version?: unknown; note?: unknown }
    if (typeof note !== 'string' || note.length === 0) continue
    entries.push({
      version: typeof version === 'string' ? version : '',
      note: note.slice(0, MAX_RELEASE_NOTE_CHARS)
    })
  }
  return entries.length > 0 ? entries : undefined
}

export function createUpdaterController(options: UpdaterControllerOptions): UpdaterController {
  const { autoUpdater, isPackaged, emit, log } = options

  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoDownload = options.preferences.autoDownload
  // allowPrerelease (beta channel) only changes which GitHub releases `check`
  // considers.
  autoUpdater.allowPrerelease = options.preferences.allowPrerelease
  // Cross-version release notes: GitHub provider returns every release between
  // the running and the target version as ReleaseNoteInfo[] (GH-156).
  autoUpdater.fullChangelog = true
  if (!isPackaged) autoUpdater.forceDevUpdateConfig = true

  // GH-156: errors from background activity (startup auto-check, autoDownload)
  // degrade to not-available so the sidebar indicator never nags about network
  // hiccups the user didn't ask about. User-initiated check/download errors
  // surface as phase:error. Always logged either way.
  // The flag is only (re)assigned when an action starts, never inside emitError:
  // a rejected user check fires both the 'error' event and the catch below, and
  // both emissions must stay identical (error + error, or silence + silence).
  let userInitiated = false
  const emitError = (error: unknown): void => {
    log('updater', error)
    if (userInitiated) {
      emit({ phase: 'error', error: error instanceof Error ? error.message : String(error) })
    } else {
      emit({ phase: 'not-available' })
    }
  }

  autoUpdater.on('checking-for-update', () => emit({ phase: 'checking' }))
  autoUpdater.on('update-available', (...args: never[]) => {
    const info = args[0] as { version?: string; releaseNotes?: unknown } | undefined
    emit({
      phase: 'available',
      version: info?.version,
      releaseNotes: normalizeReleaseNotes(info?.version, info?.releaseNotes)
    })
  })
  autoUpdater.on('update-not-available', () => emit({ phase: 'not-available' }))
  autoUpdater.on('download-progress', (...args: never[]) => {
    const progress = args[0] as { percent?: number } | undefined
    emit({ phase: 'downloading', percent: Math.round(progress?.percent ?? 0) })
  })
  autoUpdater.on('update-downloaded', (...args: never[]) => {
    const info = args[0] as { version?: string; releaseNotes?: unknown } | undefined
    emit({
      phase: 'downloaded',
      version: info?.version,
      releaseNotes: normalizeReleaseNotes(info?.version, info?.releaseNotes)
    })
  })
  autoUpdater.on('error', (...args: never[]) => {
    emitError(args[0] as Error | undefined)
  })

  return {
    async check(checkOptions?: { userInitiated?: boolean }): Promise<void> {
      userInitiated = checkOptions?.userInitiated !== false
      try {
        await autoUpdater.checkForUpdates()
      } catch (error) {
        // The 'error' listener above usually fires too; this catch covers
        // rejections raised before the event wiring.
        emitError(error)
      }
    },
    async download(): Promise<void> {
      userInitiated = true
      try {
        await autoUpdater.downloadUpdate()
      } catch (error) {
        emitError(error)
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
