import type { AgentView, Asset, AssetStats, CostMode, UsageSummary } from '@shared/types/asset'
import type { DashboardInsights } from '@shared/types/insights'
import type {
  AgentScanSourceGroup,
  AssetScanPartial,
  AssetScanProgress,
  AssetRuntimeStatus,
  AssetScanReason,
  AssetSnapshot,
  HealthCheck,
  HealthCheckRequest,
  SearchResult,
  SessionListResult,
  ScanEngineInfo,
  ScanEngineSchedulerSnapshot,
  ScanEngineSettings,
  ScanHistoryEntry,
  ScanResult
} from '@shared/types/ipc'
import type { AppScopeSelection, ProjectScopeCandidate } from '@shared/scope'
import { assetMatchesAppScope, DEFAULT_SCOPE_SELECTION, matchesAgentView, normalizeScopeSelection } from '@shared/scope'
import { assetMatchesProjectPath } from '../../project-scope'
import { runHealthChecks } from '../health'
import { getSearch } from '../search'
import { buildUsageSummary } from '../usage'
import { buildDashboardInsights } from '../activity-insights'
import { WorkerAssetScanner } from './worker-host'
import { mergeSharedConventions } from '../scanner'
import { toSessionSummary } from '../session-detail'
import { readString } from '@shared/object-guards'
import { stripRaw, type SnapshotStore } from './snapshot-store'
import { SnapshotSelectorCache, type AssetSelectorCache } from './selector-cache'
import { ProjectSnapshotCache, projectSnapshotKey } from './project-snapshot-cache'
import { ScanCoordinator, type AssetRuntimeScanner, type ScanOutcome, type ScanSink } from './scan-coordinator'
import { SCAN_ENGINE_NAME, SCAN_ENGINE_VERSION } from '../../index'
import {
  DEFAULT_SCAN_ENGINE_SETTINGS,
  applyScanEnginePreset,
  buildScanEngineSettingControls,
  normalizeScanEngineSettings,
  type ScanEngineSettingsStore
} from './settings'

// Scanner contract moved to scan-coordinator.ts (GH-122); re-exported so the
// existing import surface (worker-host, tests) stays unchanged.
export type { AssetRuntimeScanOptions, AssetRuntimeScanner } from './scan-coordinator'

/** Pushed to the main process on every progress tick / partial during a scan so
 * it can forward live status + already-scanned assets to the renderer (P4.6). */
export interface AssetProgressPayload {
  status: AssetRuntimeStatus
  partial?: AssetScanPartial
}

export interface AssetRefreshOptions {
  reason?: AssetScanReason
  wait?: boolean
}

export interface AssetScheduledRefreshOptions extends AssetRefreshOptions {
  delayMs?: number
  minIntervalMs?: number
}

export interface AssetRuntimeEnsureOptions {
  reason?: AssetScanReason
  refresh?: boolean
}

/** OS power/idle signals for periodic-scan gating (GH-135 B3). Injected by the
 * main process from Electron's powerMonitor; the engine stays electron-free. */
export interface PowerMonitorLike {
  /** Milliseconds since the last user input. */
  getSystemIdleTimeMs(): number
  /** True when the device is running on battery. */
  onBatteryPower(): boolean
}

export interface AssetRuntimeOptions {
  projectDir?: string
  powerMonitor?: PowerMonitorLike
  createScanner?: (projectDir?: string) => AssetRuntimeScanner
  now?: () => string
  createSnapshotId?: () => string
  /** Persists the snapshot for instant cold-start (GH-113 T1). Injected by the
   * host with `app.getPath('userData')`; absent in tests that don't exercise it. */
  snapshotStore?: SnapshotStore
  settingsStore?: ScanEngineSettingsStore
}

interface ScheduledRefreshState {
  reason: AssetScanReason
  delayMs: number
  scheduledAtMs: number
  dueAtMs: number
}

/** Cap on retained scan-history entries (GH-135 G7) — enough to chart a trend,
 * bounded so the persisted blob stays small. Oldest entries roll off. */
const SCAN_HISTORY_LIMIT = 50

/** How long a cached project snapshot counts as fresh on switch-back (GH-151 S8).
 * The watcher only covers the ACTIVE project, so an inactive project's cache
 * entry just ages. Inside the window the entry serves as ready (rapid A↔B
 * switching stays rescan-free); past it the entry still serves instantly but is
 * marked stale so ensureReady's SWR kicks a background refresh — previously the
 * hit was forced ready/stale:false unconditionally and never revalidated until
 * the 24h periodic scan. */
const PROJECT_CACHE_FRESH_MS = 5 * 60_000

const EMPTY_ASSET_STATS: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0
}

export const WATCHER_REFRESH_DEBOUNCE_MS = DEFAULT_SCAN_ENGINE_SETTINGS.watcherDebounceMs
export const WATCHER_REFRESH_MIN_INTERVAL_MS = DEFAULT_SCAN_ENGINE_SETTINGS.watcherMinIntervalMs

export class AgentAssetRuntime {
  private projectDir?: string
  private scopeSelection: AppScopeSelection = DEFAULT_SCOPE_SELECTION
  private readonly snapshotCache = new ProjectSnapshotCache()
  private readonly coordinator: ScanCoordinator
  private snapshot: AssetSnapshot
  private status: AssetRuntimeStatus
  private assetMap = new Map<string, Asset>()
  private readonly selectorCache: AssetSelectorCache
  private readonly now: () => string
  private readonly createSnapshotId: () => string
  private readonly snapshotStore?: SnapshotStore
  private readonly settingsStore?: ScanEngineSettingsStore
  private settings: ScanEngineSettings
  private readonly initialProjectDir?: string
  private progressListener?: (payload: AssetProgressPayload) => void
  private scheduledRefreshTimer: ReturnType<typeof setTimeout> | null = null
  private scheduledRefreshInfo: ScheduledRefreshState | null = null
  private pendingRefresh: AssetRefreshOptions | null = null
  private pendingRefreshWaiters: Array<() => void> = []
  private flushingPendingRefresh = false
  private lastWatcherRefreshStartedAtMs = 0
  private lastScanDurationMs: number | undefined
  // Stable index size shown while a rescan rebuilds the snapshot (GH-135 G1). The
  // top-of-panel "assets / files" metrics read these during a scan so they don't
  // flicker 0→N every full rescan; applyPartial still streams the live asset list
  // for progressive display. 0 means "no committed scan yet" → fall back to the
  // live count so the first index build still shows progressive growth.
  private stableIndexedAssets = 0
  private stableIndexedFiles = 0
  // Raw scan history (GH-135 G7), oldest→newest. The engine only records; the UI
  // derives intervals / averages / rates and charts the trend.
  private scanHistory: ScanHistoryEntry[] = []
  private schedulerPaused = false
  private readonly powerMonitor?: PowerMonitorLike
  private periodicTimer: ReturnType<typeof setTimeout> | null = null
  private nextPeriodicScanAtMs: number | undefined
  // GH-155 W3: sourceKeys the watcher folded while a scan was in flight. The scan
  // stream read those files at t0, so its partial/commit rows for these keys are
  // stale — retention swaps them for the live snapshot's rows until the scan ends.
  private readonly midScanSourceKeys = new Set<string>()

  constructor(options: AssetRuntimeOptions = {}) {
    this.projectDir = options.projectDir
    this.initialProjectDir = options.projectDir
    this.now = options.now ?? (() => new Date().toISOString())
    this.createSnapshotId = options.createSnapshotId ?? createDefaultSnapshotId
    this.snapshotStore = options.snapshotStore
    this.settingsStore = options.settingsStore
    this.powerMonitor = options.powerMonitor
    this.settings = normalizeScanEngineSettings(this.settingsStore?.load())
    this.coordinator = new ScanCoordinator(
      options.createScanner ?? ((projectDir) => new WorkerAssetScanner(projectDir)),
      this.projectDir
    )
    this.selectorCache = new SnapshotSelectorCache()
    this.status = this.createIdleStatus()
    this.snapshot = this.createInitialSnapshot()
    this.restorePersistedSnapshot()
    this.scanHistory = this.snapshotStore?.loadScanHistory?.() ?? []
  }

  /**
   * Cold-start (GH-113 T1): seed the runtime with the last persisted snapshot so
   * the renderer shows the previous result instantly. The status is `stale`, which
   * the renderer reacts to by triggering a background `refresh()` — SWR. A scan
   * has not run yet, so the persisted assets are served verbatim until it does.
   */
  private restorePersistedSnapshot(): void {
    const persisted = this.snapshotStore?.load()
    if (!persisted || persisted.assets.length === 0) return
    const status: AssetRuntimeStatus = {
      state: 'stale',
      stale: true,
      projectDir: this.projectDir,
      lastCompletedAt: persisted.status?.lastCompletedAt
    }
    this.status = status
    this.snapshot = { ...persisted, projectDir: this.projectDir, status }
    this.setStableCounts(persisted.assets)
    this.assetMap = new Map(persisted.assets.map((asset) => [asset.id, asset]))
    this.snapshotCache.set(this.projectDir, this.snapshot)
  }

  /** Record the committed index size so the panel metrics hold steady during the
   * next rescan instead of counting up from 0 (GH-135 G1). */
  private setStableCounts(assets: Asset[]): void {
    this.stableIndexedAssets = assets.length
    this.stableIndexedFiles = countIndexedFiles(assets)
  }

  /** Register the sink that forwards live scan status + partial assets to the
   * renderer. The main process wires this to `webContents.send`. */
  setProgressListener(listener: ((payload: AssetProgressPayload) => void) | undefined): void {
    this.progressListener = listener
  }

  getStatus(): AssetRuntimeStatus {
    return this.status
  }

  getSnapshot(): AssetSnapshot {
    return this.snapshot
  }

  /** IPC projection of the snapshot (GH-151 S6): full-list surfaces must not drag
   * multi-MB raw bodies through structured clone on every sync. Raw stays in
   * memory for `getAsset` — the raw viewer reads single assets via assets:get and
   * has NO disk re-read fallback. Uncached on purpose: applyPartial mutates
   * assets under a stable snapshot id, so an id-keyed cache would serve stale
   * lists mid-scan; the shallow map is cheap next to the clone it replaces. */
  getLeanSnapshot(): AssetSnapshot {
    return { ...this.snapshot, assets: this.snapshot.assets.map(stripRaw) }
  }

  getSettings(): ScanEngineSettings {
    return this.settings
  }

  setSettings(patch: Partial<ScanEngineSettings>): ScanEngineSettings {
    if (patch.preset && patch.preset !== 'custom') {
      // GH-135 E3: selecting a named preset applies its tuning overrides.
      this.settings = normalizeScanEngineSettings({ ...applyScanEnginePreset(patch.preset), ...patch })
    } else {
      // Editing a raw value flips the preset to 'custom' (unless the caller set it).
      const editsRawValue = Object.keys(patch).some((key) => key !== 'preset')
      this.settings = normalizeScanEngineSettings({
        ...this.settings,
        ...patch,
        ...(editsRawValue && patch.preset === undefined ? { preset: 'custom' as const } : {})
      })
    }
    this.settingsStore?.save(this.settings)
    return this.settings
  }

  getEngineInfo(): ScanEngineInfo {
    const sourceRows = countScanSourceRows(this.snapshot.sources)
    // While a rescan rebuilds the snapshot, report the last committed size so the
    // metrics hold steady instead of counting up from 0 (GH-135 G1). Before the
    // first commit (stable=0) fall through to the live count for progressive growth.
    const rescanning = this.status.state === 'scanning' && this.stableIndexedAssets > 0
    const indexedAssets = rescanning ? this.stableIndexedAssets : this.snapshot.assets.length
    const indexedFiles = rescanning ? this.stableIndexedFiles : countIndexedFiles(this.snapshot.assets)
    return {
      engine: {
        name: SCAN_ENGINE_NAME,
        packageName: SCAN_ENGINE_NAME,
        version: SCAN_ENGINE_VERSION
      },
      status: this.status,
      snapshot: {
        id: this.snapshot.id,
        indexedAssets,
        indexedFiles,
        errors: this.snapshot.errors.length,
        sourceGroups: this.snapshot.sources.length,
        sourceRows
      },
      scheduler: this.getSchedulerSnapshot(),
      controls: [
        ...buildScanEngineSettingControls(this.settings, process.platform),
        // Dynamic runtime state (GH-135 G6): only values that actually change and
        // carry information for the user. Fixed implementation descriptors
        // (manual-refresh / worker-mode / scheduler-mode / scope-fallback /
        // persisted-settings) were dropped as noise — they never varied.
        { id: 'pause', value: this.schedulerPaused ? 'paused' : 'active', unit: 'state', editable: false, supported: true },
        { id: 'cancel', value: this.coordinator.isScanning() ? 'scanning' : 'idle', unit: 'state', editable: false, supported: true },
        {
          id: 'scheduled-refresh',
          value: this.scheduledRefreshInfo?.reason ?? 'none',
          unit: 'state',
          editable: false,
          supported: true
        },
        {
          id: 'queued-refresh',
          value: this.pendingRefresh?.reason ?? 'none',
          unit: 'state',
          editable: false,
          supported: true
        },
        { id: 'last-scan-reason', value: this.status.reason ?? 'none', unit: 'state', editable: false, supported: true },
        { id: 'last-scan-duration', value: this.lastScanDurationMs ?? 0, unit: 'ms', editable: false, supported: true },
        { id: 'source-groups', value: this.snapshot.sources.length, editable: false, supported: true }
      ],
      capabilities: {
        // GH-154 条目8: 照实从注入的 scanner 推导 — 生产 helper 是长驻 utilityProcess
        // 且可 kill; CLI worker 是 one-shot 且无硬中止 (结果由代际 guard 丢弃)。
        workerMode: this.coordinator.current().workerMode ?? 'one-shot',
        schedulerMode: 'single-flight-queued-project-scope',
        scopeMode: 'scan-on-miss',
        cacheMode: 'sqlite-swr',
        incrementalFileChanges: true,
        pauseSupported: true,
        cancelSupported: typeof this.coordinator.current().cancel === 'function',
        writableSettingsSupported: true,
        osThrottleSupported: this.settings.osThrottleEnabled && process.platform !== 'win32'
      },
      limits: [
        { id: 'metadata-only-sensitive-files', level: 'info', enabled: true },
        { id: 'third-party-code-not-executed', level: 'info', enabled: true },
        { id: 'unsupported-plugin-bundled-incremental', level: 'warning', enabled: true }
      ],
      scanHistory: this.scanHistory
    }
  }

  getScanResult(): ScanResult {
    // Lean like getLeanSnapshot — the sole consumer is the project-scope
    // activation IPC payload (GH-151 S6).
    return {
      assets: this.snapshot.assets.map(stripRaw),
      stats: this.snapshot.stats,
      errors: this.snapshot.errors
    }
  }

  getAssets(): Asset[] {
    return this.snapshot.assets
  }

  getAsset(id: string): Asset | null {
    return this.assetMap.get(id) ?? null
  }

  getProjectDir(): string | undefined {
    return this.projectDir
  }

  getScopeSelection(): AppScopeSelection {
    return this.scopeSelection
  }

  /** Active scope (global/user/project). Used to scope server-side reads like
   * search. Updated on scope switch without a rescan (sub-second switching). */
  setScopeSelection(selection: AppScopeSelection): void {
    this.scopeSelection = normalizeScopeSelection(selection)
    this.selectorCache.clear()
  }

  /** Whether a (cached) snapshot already exists for the given project. */
  hasSnapshotFor(projectDir?: string): boolean {
    return this.snapshotCache.has(projectDir)
  }

  private isCacheEntryFresh(lastCompletedAt: string | undefined): boolean {
    if (!lastCompletedAt) return false
    const completed = Date.parse(lastCompletedAt)
    if (Number.isNaN(completed)) return false
    return Date.parse(this.now()) - completed < PROJECT_CACHE_FRESH_MS
  }

  setProjectDir(projectDir?: string): void {
    if (this.projectDir === projectDir) return

    this.clearScheduledRefresh()
    this.projectDir = projectDir
    // Swap the scanner generation: results of any in-flight scan against the
    // old project are discarded by the coordinator (GH-111 R4).
    this.coordinator.swap(projectDir)
    this.selectorCache.clear()

    // Serve a cached snapshot for this project instantly (sub-second switching).
    const cached = this.snapshotCache.get(projectDir)
    if (cached) {
      this.snapshot = cached
      this.assetMap = new Map(cached.assets.map((asset) => [asset.id, asset]))
      // GH-151 S8: only a recently-scanned entry counts as fresh; an aged one
      // (cold-start restore, or aged while another project was active) is served
      // but marked stale so the SWR machinery revalidates it in the background.
      this.status = this.isCacheEntryFresh(cached.status.lastCompletedAt)
        ? { ...cached.status, projectDir, state: 'ready', stale: false }
        : { ...cached.status, projectDir, state: 'stale', stale: true }
      return
    }

    this.status = this.snapshot.id === 'initial'
      ? this.createIdleStatus()
      : {
          ...this.status,
          state: 'stale',
          projectDir,
          stale: true
        }
    this.snapshot = {
      ...this.snapshot,
      projectDir,
      status: this.status
    }
  }

  async refresh(options: AssetRefreshOptions = {}): Promise<AssetRuntimeStatus> {
    this.clearScheduledRefresh()
    if (this.coordinator.isScanning()) {
      // GH-151 S4: never drop a refresh mid-scan — every reason folds into the
      // single-slot latest-wins queue and run.finally flushes it. (Previously
      // only project-scope queued; watcher/manual refreshes landing in the
      // 30s-1min scan window silently vanished, and rebuild()'s cancel→refresh
      // always fell into that dead zone because the killed scan settles async.)
      // wait:true resolves once the QUEUED refresh completes (not merely the
      // current scan) — cancel/pause resolve waiters early so no caller hangs.
      const flushed = this.queuePendingRefresh(options)
      if (options.wait) await flushed
      return this.status
    }

    const reason = options.reason ?? 'manual'
    if (reason === 'watcher') {
      this.lastWatcherRefreshStartedAtMs = Date.now()
    }
    this.status = {
      state: 'scanning',
      reason,
      projectDir: this.projectDir,
      startedAt: this.now(),
      lastCompletedAt: this.status.lastCompletedAt,
      stale: this.snapshot.id !== 'initial'
    }
    this.snapshot = {
      ...this.snapshot,
      status: this.status
    }

    const run = this.coordinator.run(this.createScanSink(reason), {
      batchPauseMs: this.settings.batchPauseMs,
      excludePaths: this.settings.excludePaths,
      respectGitignore: this.settings.respectGitignore
    })
    void run.finally(() => {
      void this.flushPendingRefresh()
    })
    if (options.wait) await run
    return this.status
  }

  /** Pause the periodic scheduler (GH-135): stop auto-rescans and cancel any
   * in-flight scan (its already-scanned assets stay visible). Resume re-arms it.
   * Pause is a scheduler state, not a scan state. */
  pause(): void {
    this.schedulerPaused = true
    this.clearScheduledRefresh()
    this.clearPeriodic()
    // GH-151 S4: also drop anything already queued — paused means no auto-flush.
    this.dropPendingRefresh()
    if (this.coordinator.isScanning()) this.cancel()
  }

  resume(): void {
    this.schedulerPaused = false
    this.schedulePeriodic()
  }

  /** Cancel the in-flight scan (GH-135): kill the helper, keep already-scanned
   * assets, transition to stale (a fresh scan can be triggered any time). */
  cancel(): void {
    if (!this.coordinator.isScanning()) return
    this.coordinator.cancel()
    // GH-151 S4: cancel means "stop and stay stopped" — drop the queued refresh
    // so run.finally's flush doesn't immediately restart what the user stopped.
    // rebuild() re-queues AFTER this, so its rescan survives.
    this.dropPendingRefresh()
    // GH-155 W3: the retention window closes with the scan it protected against.
    this.midScanSourceKeys.clear()
    this.status = { ...this.status, state: 'stale', stale: true }
    this.snapshot = { ...this.snapshot, status: this.status }
    this.progressListener?.({ status: this.status })
  }

  /** Rebuild the index from scratch (GH-135): drop the persisted + in-memory index
   * and trigger a full rescan. Destructive — the GUI gates this behind a warning. */
  async rebuild(options: AssetRefreshOptions = {}): Promise<AssetRuntimeStatus> {
    if (this.coordinator.isScanning()) this.cancel()
    this.snapshotStore?.clear()
    this.snapshotCache.clear()
    this.lastScanDurationMs = undefined
    // Index cleared → drop the stable baseline so the rebuild shows growth from 0.
    this.setStableCounts([])
    this.assetMap.clear()
    this.selectorCache.clear()
    this.snapshot = this.createInitialSnapshot()
    this.status = this.createIdleStatus()
    return this.refresh({ reason: options.reason ?? 'manual', wait: options.wait })
  }

  /** Arm the periodic full-rescan timer (GH-135 B3). Re-armed after each periodic
   * scan; cleared on pause. No-op when disabled, interval<=0, or paused. */
  schedulePeriodic(): void {
    this.clearPeriodic()
    if (!this.settings.periodicScanEnabled || this.schedulerPaused) return
    const intervalMs = this.settings.periodicScanIntervalMs
    if (intervalMs <= 0) return
    this.nextPeriodicScanAtMs = Date.parse(this.now()) + intervalMs
    this.periodicTimer = setTimeout(() => {
      this.periodicTimer = null
      this.nextPeriodicScanAtMs = undefined
      void this.runPeriodicScan()
    }, intervalMs)
  }

  /** Run a periodic full rescan, gated by idle + power policy (GH-135 B3). Defers
   * (re-arms) when the user is active (idleOnly) or on battery (acOnlyFullScan). */
  private async runPeriodicScan(): Promise<void> {
    if (
      this.settings.idleOnly &&
      this.powerMonitor &&
      this.powerMonitor.getSystemIdleTimeMs() < this.settings.idleThresholdMs
    ) {
      this.schedulePeriodic()
      return
    }
    if (this.settings.acOnlyFullScan && this.powerMonitor?.onBatteryPower()) {
      this.schedulePeriodic()
      return
    }
    await this.refresh({ reason: 'manual' })
    this.schedulePeriodic()
  }

  private clearPeriodic(): void {
    if (this.periodicTimer) clearTimeout(this.periodicTimer)
    this.periodicTimer = null
    this.nextPeriodicScanAtMs = undefined
  }

  scheduleRefresh(options: AssetScheduledRefreshOptions = {}): void {
    const reason = options.reason ?? 'manual'
    const delayMs = Math.max(0, options.delayMs ?? (reason === 'watcher' ? this.settings.watcherDebounceMs : 0))
    const minIntervalMs = Math.max(0, options.minIntervalMs ?? (reason === 'watcher' ? this.settings.watcherMinIntervalMs : 0))
    const elapsedSinceWatcherRefresh = this.lastWatcherRefreshStartedAtMs > 0
      ? Math.max(0, Date.now() - this.lastWatcherRefreshStartedAtMs)
      : minIntervalMs
    const rateLimitDelayMs = reason === 'watcher'
      ? Math.max(0, minIntervalMs - elapsedSinceWatcherRefresh)
      : 0
    const scheduledDelayMs = Math.max(delayMs, rateLimitDelayMs)
    const scheduledAtMs = Date.now()

    this.clearScheduledRefresh()
    this.scheduledRefreshInfo = {
      reason,
      delayMs: scheduledDelayMs,
      scheduledAtMs,
      dueAtMs: scheduledAtMs + scheduledDelayMs
    }
    this.scheduledRefreshTimer = setTimeout(() => {
      this.scheduledRefreshTimer = null
      this.scheduledRefreshInfo = null
      void this.refresh({ reason, wait: options.wait })
    }, scheduledDelayMs)
  }

  select<T>(key: string, derive: (snapshot: AssetSnapshot) => T): T {
    return this.selectorCache.select(key, this.snapshot, derive)
  }

  /**
   * Serve the current snapshot to a derived read, refreshing per SWR (GH-140).
   *
   * The cold-start stall fix: `restorePersistedSnapshot` marks the runtime `stale`
   * on every cold start, and `ensureReady` used to `await refresh({ wait: true })`
   * on `stale` — so every derived read (dashboard insights, usage, sessions,
   * health, search, …) blocked behind the full rescan, freezing the first screen
   * behind the top loading bar for the whole 30s–1min scan. Now: with any usable
   * snapshot in hand (`id !== 'initial'`), return it instantly and, if it's stale,
   * kick a background refresh (no await). The renderer reacts to the eventual
   * `assets:changed` and reloads (SWR). Only an empty index (`initial` — first ever
   * launch, or an error before the first commit) genuinely has nothing to show, so
   * it still blocks on the first scan. An explicit `refresh` always blocks.
   */
  async ensureReady(options: AssetRuntimeEnsureOptions = {}): Promise<AssetSnapshot> {
    if (options.refresh) {
      await this.refresh({ reason: options.reason ?? 'manual', wait: true })
      return this.snapshot
    }
    if (this.snapshot.id !== 'initial') {
      if (this.status.state === 'stale') {
        void this.refresh({ reason: options.reason ?? 'manual', wait: false })
      }
      return this.snapshot
    }
    // First-ever index build: this read only needs SOME committed snapshot, so it
    // JOINS an in-flight scan. Routing through refresh(wait:true) would queue a
    // redundant second full scan behind the startup one (GH-151 S4) — derived
    // reads fire in bursts while it runs, and each would re-queue.
    if (this.coordinator.isScanning()) {
      await this.coordinator.wait()
      return this.snapshot
    }
    await this.refresh({ reason: options.reason ?? 'manual', wait: true })
    return this.snapshot
  }

  async getScanSourceGroups(): Promise<AgentScanSourceGroup[]> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    return snapshot.sources
  }

  async getProjectCandidates(): Promise<ProjectScopeCandidate[]> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    return snapshot.projectCandidates
  }

  async search(query: string): Promise<SearchResult[]> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    const sel = this.scopeSelection
    const scopeKey = sel.mode === 'project' ? `project:${sel.projectPathKey}` : sel.mode
    // Server-side search honors the SAME scope predicate as the rendered list
    // (shared assetMatchesAppScope). With owner-tagged cross-project assets, this
    // filters project mode to the active project (incl. inheritance chain) without
    // leaking shallow-indexed other projects. (GH-113 T3)
    return this.select(`search:${scopeKey}:${query}`, () =>
      getSearch()
        .search(query, snapshot.assets)
        .filter((result) => assetMatchesAppScope(result.asset, sel))
    )
  }

  /**
   * Health checks are deliberately DEVICE-WIDE (GH-113 T3): they evaluate every
   * asset in the snapshot, NOT the active scope selection. Health surfaces
   * system-level problems (a broken `~/.claude/settings.json`, a hook conflict),
   * so scope-filtering would HIDE issues outside the active project — contrary to
   * "global = all device assets". The cache key is `snapshot.id` alone (scope-
   * independent), and search's `assetMatchesAppScope` filter is intentionally NOT
   * applied here. Confirmed product decision — do not "unify" this with scope; see
   * the device-wide test in agent-asset-runtime.test.ts.
   */
  async getHealthChecks(opts: HealthCheckRequest = {}): Promise<HealthCheck[]> {
    const snapshot = await this.ensureReady({ reason: 'manual', refresh: opts.refresh })
    return this.select(`health:${snapshot.id}`, () => runHealthChecks({
      projectDir: snapshot.projectDir,
      assets: snapshot.assets,
      scanErrors: snapshot.errors
    }))
  }

  async getUsageSummary(opts: { days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }): Promise<UsageSummary> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    const cacheKey = `usage:${JSON.stringify(opts)}`
    return this.select(cacheKey, () => buildUsageSummary(
      snapshot.assets.filter((asset) => sessionMatchesAgentView(asset, opts.agentView)),
      { days: opts.days, costMode: opts.costMode, projectPath: opts.projectPath }
    ))
  }

  async getDashboardInsights(
    opts: { days?: number; agentView?: AgentView; projectPath?: string } = {}
  ): Promise<DashboardInsights> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    const cacheKey = `insights:${JSON.stringify(opts)}`
    return this.select(cacheKey, () => {
      const projectPath = opts.projectPath
      let assets = snapshot.assets.filter((asset) => sessionMatchesAgentView(asset, opts.agentView))
      if (projectPath) assets = assets.filter((asset) => assetMatchesProjectPath(asset, projectPath))
      // stats 用全局清单计数: "已探索技能/已装插件/已配 mcp" 本就是 inventory, 不随 agent/project 过滤。
      // tzOffsetMinutes: 主进程 = 用户本机, 取本地相对 UTC 偏移, 让 rhythm 按用户本地作息呈现。
      return buildDashboardInsights(assets, snapshot.stats, {
        days: opts.days,
        tzOffsetMinutes: -new Date().getTimezoneOffset()
      })
    })
  }

  async listSessions(opts: { projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }): Promise<SessionListResult> {
    const snapshot = await this.ensureReady({ reason: 'manual' })
    const cacheKey = `sessions:${JSON.stringify(opts)}`
    return this.select(cacheKey, () => {
      let sessions = snapshot.assets
        .filter((asset) => asset.type === 'session')
        .filter((asset) => sessionMatchesAgentView(asset, opts.agentView))

      if (opts.projectFilter) {
        sessions = sessions.filter((session) => sessionMatchesProjectFilter(session, opts.projectFilter!))
      }
      if (opts.projectPath) {
        sessions = sessions.filter((session) => assetMatchesProjectPath(session, opts.projectPath!))
      }

      sessions.sort((a, b) => getSessionSortTime(b) - getSessionSortTime(a))

      const totalCount = sessions.length
      if (opts.limit && opts.limit > 0) {
        sessions = sessions.slice(0, opts.limit)
      }

      return {
        sessions: sessions.map(toSessionSummary),
        totalCount
      }
    })
  }

  /** The data-commit half of a scan (GH-122): the coordinator executes and
   * generation-guards (GH-111 R4 — callbacks of a swapped-away scan never
   * arrive here); this sink owns every state transition and cache write. */
  private createScanSink(reason: AssetScanReason): ScanSink {
    return {
      onProgress: (progress) => this.setProgress(progress),
      onPartial: (partial) => this.applyPartial(partial),
      onCompleted: (outcome) => this.commitScan(reason, outcome),
      onFailed: (error) => this.failScan(reason, error)
    }
  }

  private commitScan(reason: AssetScanReason, outcome: ScanOutcome): void {
    // GH-155 W3: the committed enumeration read files at scan time; keys the
    // watcher folded during the scan are fresher and replace the scan's rows
    // (deletion included). The window closes with the scan.
    const assets = this.retainMidScanFolds(outcome.scanResult.assets)
    const stats = assets === outcome.scanResult.assets ? outcome.scanResult.stats : computeAssetStats(assets)
    this.midScanSourceKeys.clear()
    const projectDir = outcome.projectDir ?? this.projectDir
    const status: AssetRuntimeStatus = {
      state: 'ready',
      reason,
      projectDir,
      startedAt: this.status.startedAt,
      lastCompletedAt: this.now(),
      stale: false
    }

    // ETA baseline (GH-135): record how long this scan took for the next scan's ETA.
    if (this.status.startedAt && status.lastCompletedAt) {
      this.lastScanDurationMs = Math.max(0, Date.parse(status.lastCompletedAt) - Date.parse(this.status.startedAt))
    }
    this.projectDir = projectDir
    this.status = status
    this.snapshot = {
      id: this.createSnapshotId(),
      projectDir,
      assets,
      stats,
      errors: outcome.scanResult.errors,
      sources: outcome.sources,
      projectCandidates: outcome.projectCandidates,
      status
    }
    this.setStableCounts(assets)
    this.recordScanHistory({
      reason,
      durationMs: this.lastScanDurationMs ?? 0,
      assetCount: assets.length,
      fileCount: countIndexedFiles(assets),
      errorCount: outcome.scanResult.errors.length,
      ok: true,
      projectDir,
      sourceCount: outcome.sources.length
    })
    this.assetMap = new Map(assets.map((asset) => [asset.id, asset]))
    this.snapshotCache.set(projectDir, this.snapshot)
    this.selectorCache.clear()
    this.persistIfDefaultView(projectDir)
    // Emit the terminal status on the SAME progress channel as the live ticks
    // so the renderer's last event is authoritative. Without this, a trailing
    // "scanning" progress macrotask can clobber the `ready` set by the
    // refresh() reply microtask, leaving the UI stuck at scanning (P4.6 fix).
    this.progressListener?.({ status })
  }

  private failScan(reason: AssetScanReason, error: unknown): void {
    // GH-155 W3: the failed scan's retention window closes with it; the folded
    // rows themselves already live in the snapshot.
    this.midScanSourceKeys.clear()
    // The stack was already logged at the coordinator (the single failure sink);
    // here only the state transition remains.
    this.status = {
      state: 'error',
      reason,
      projectDir: this.projectDir,
      startedAt: this.status.startedAt,
      lastCompletedAt: this.status.lastCompletedAt,
      stale: this.snapshot.id !== 'initial',
      error: error instanceof Error ? error.message : String(error)
    }
    this.snapshot = {
      ...this.snapshot,
      status: this.status
    }
    this.recordScanHistory({
      reason,
      durationMs: this.status.startedAt ? Math.max(0, Date.parse(this.now()) - Date.parse(this.status.startedAt)) : 0,
      assetCount: this.snapshot.assets.length,
      fileCount: countIndexedFiles(this.snapshot.assets),
      errorCount: this.snapshot.errors.length + 1,
      ok: false,
      projectDir: this.projectDir,
      sourceCount: this.snapshot.sources.length
    })
    this.progressListener?.({ status: this.status })
  }

  /** Append a completed/failed scan to the bounded history and persist it (GH-135
   * G7). Engine records raw entries only; the UI derives intervals/averages/rates. */
  private recordScanHistory(entry: Omit<ScanHistoryEntry, 'at'>): void {
    this.scanHistory = [...this.scanHistory, { at: this.now(), ...entry }].slice(-SCAN_HISTORY_LIMIT)
    this.snapshotStore?.saveScanHistory?.(this.scanHistory)
  }

  /** Persist only the default/global view so the next cold start restores the
   * same scope the app opens in — not whatever project was last selected. (T1) */
  private persistIfDefaultView(projectDir?: string): void {
    if (projectSnapshotKey(projectDir) === projectSnapshotKey(this.initialProjectDir)) {
      this.snapshotStore?.save(this.snapshot)
    }
  }

  private createIdleStatus(): AssetRuntimeStatus {
    return {
      state: 'idle',
      stale: false,
      projectDir: this.projectDir
    }
  }

  private createInitialSnapshot(): AssetSnapshot {
    return {
      id: 'initial',
      projectDir: this.projectDir,
      assets: [],
      stats: EMPTY_ASSET_STATS,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: this.status
    }
  }

  private clearScheduledRefresh(): void {
    if (this.scheduledRefreshTimer) {
      clearTimeout(this.scheduledRefreshTimer)
    }
    this.scheduledRefreshTimer = null
    this.scheduledRefreshInfo = null
  }

  private queuePendingRefresh(options: AssetRefreshOptions): Promise<void> {
    this.pendingRefresh = {
      reason: options.reason,
      wait: false
    }
    return new Promise<void>((resolve) => {
      this.pendingRefreshWaiters.push(resolve)
    })
  }

  /** Drop the queued refresh and release its waiters (GH-151 S4). Used by
   * cancel/pause — "stop" must not auto-restart via the queue, and a waiting
   * IPC caller must settle rather than hang. */
  private dropPendingRefresh(): void {
    this.pendingRefresh = null
    const waiters = this.pendingRefreshWaiters
    this.pendingRefreshWaiters = []
    for (const release of waiters) release()
  }

  private async flushPendingRefresh(): Promise<void> {
    if (this.flushingPendingRefresh) return
    this.flushingPendingRefresh = true
    try {
      // Loop: a refresh queued DURING the flushed scan would otherwise strand —
      // its own run.finally re-enters here and hits the flushing guard.
      while (this.pendingRefresh) {
        const pending = this.pendingRefresh
        const waiters = this.pendingRefreshWaiters
        this.pendingRefresh = null
        this.pendingRefreshWaiters = []
        try {
          // wait:true so waiters observe the queued scan's COMPLETION (Q4).
          await this.refresh({ reason: pending.reason, wait: true })
        } finally {
          for (const release of waiters) release()
        }
      }
    } finally {
      this.flushingPendingRefresh = false
    }
  }

  private getSchedulerSnapshot(): ScanEngineSchedulerSnapshot {
    const scheduled = this.scheduledRefreshInfo
    return {
      scanning: this.coordinator.isScanning(),
      paused: this.schedulerPaused,
      scheduledRefresh: scheduled
        ? {
            active: true,
            reason: scheduled.reason,
            delayMs: scheduled.delayMs,
            scheduledAt: new Date(scheduled.scheduledAtMs).toISOString(),
            dueAt: new Date(scheduled.dueAtMs).toISOString()
          }
        : { active: false },
      queuedRefresh: this.pendingRefresh
        ? {
            active: true,
            reason: this.pendingRefresh.reason
          }
        : { active: false },
      periodicScan: {
        enabled: this.settings.periodicScanEnabled,
        intervalMs: this.settings.periodicScanIntervalMs,
        nextScanAt: this.nextPeriodicScanAtMs !== undefined
          ? new Date(this.nextPeriodicScanAtMs).toISOString()
          : undefined
      },
      lastWatcherRefreshStartedAt: this.lastWatcherRefreshStartedAtMs > 0
        ? new Date(this.lastWatcherRefreshStartedAtMs).toISOString()
        : undefined,
      lastScanDurationMs: this.lastScanDurationMs
    }
  }

  private setProgress(progress: AssetScanProgress): void {
    this.status = {
      ...this.status,
      progress: this.enrichProgress(progress)
    }
    this.snapshot = {
      ...this.snapshot,
      status: this.status
    }
    this.progressListener?.({ status: this.status })
  }

  /**
   * Enrich progress engine-side so the GUI renders ETA/rate/count rather than
   * deriving them (GH-135 single source of truth). ETA uses the previous scan's
   * wall-clock duration as the baseline; absent on the first scan (no baseline)
   * → undefined → the UI shows an indeterminate bar.
   */
  private enrichProgress(progress: AssetScanProgress): AssetScanProgress {
    const startedAt = this.status.startedAt
    if (!startedAt) return progress
    const elapsedMs = Math.max(0, Date.parse(this.now()) - Date.parse(startedAt))
    const scannedAssets = this.snapshot.assets.length
    const ratePerSec = elapsedMs > 0 ? Math.round((scannedAssets / elapsedMs) * 1000) : undefined
    const etaMs =
      this.lastScanDurationMs !== undefined ? Math.max(0, this.lastScanDurationMs - elapsedMs) : undefined
    return { ...progress, elapsedMs, scannedAssets, etaMs, ratePerSec }
  }

  /**
   * Fold a cumulative partial into the live snapshot so the renderer can show
   * already-scanned assets mid-scan. The snapshot id is deliberately kept stable
   * (only `runRefresh` mints a fresh id on completion) so id-keyed consumers like
   * the plugin list don't re-fetch on every partial.
   */
  private applyPartial(partial: AssetScanPartial): void {
    // Fold shallow (other-project) assets engine-side so the partial the GUI gets is
    // render-ready — GUI stays a pure projection with no fold logic (GH-135 方案 X).
    // The scanner streams deep-only partials (shallow lands in the final snapshot),
    // so mid-scan we keep the previous shallow set until a partial carries its own.
    // GH-155 W3: then swap in any rows the watcher folded DURING this scan — the
    // partial was enumerated at t0 and would otherwise clobber fresher increments.
    const assets = this.retainMidScanFolds(foldKeepingShallow(partial.assets, this.snapshot.assets))
    const stats = assets === partial.assets ? partial.stats : computeAssetStats(assets)
    this.snapshot = {
      ...this.snapshot,
      assets,
      stats
    }
    this.assetMap = new Map(assets.map((asset) => [asset.id, asset]))
    // Emit lean (GH-151 S6): scanner partials are already stripped at the stream
    // source, but foldKeepingShallow re-attaches shallow assets from the committed
    // snapshot, which carry raw in memory.
    this.progressListener?.({ status: this.status, partial: { assets: assets.map(stripRaw), stats, errorCount: partial.errorCount } })
  }

  /**
   * Apply one changed file's freshly-derived assets to the live snapshot without
   * a full rescan (GH-113 I1). Every asset previously sourced from the same file
   * (matched by normalized `sourceKey`) is replaced with `derivedAssets` — an
   * empty array means the file was deleted. The cross-agent AGENTS.md merge is
   * re-run (so a touched AGENTS.md re-collapses across adapters), stats + the
   * assetMap are recomputed, and the result is persisted + forwarded as a partial.
   * The snapshot id stays stable (mirroring applyPartial) so id-keyed consumers
   * don't re-fetch. The `derivedAssets` are produced by the caller (watcher wiring)
   * from `deriveAssetsForPath`, keeping this purely a snapshot-folding operation.
   */
  applyFileChange(sourceKey: string, derivedAssets: Asset[]): void {
    if (!sourceKey) return
    const retained = this.snapshot.assets.filter((asset) => assetSourceKey(asset) !== sourceKey)
    // The file had no assets before and produces none now → nothing changed.
    if (retained.length === this.snapshot.assets.length && derivedAssets.length === 0) return

    // GH-155 W3: a fold landing while a scan is in flight is FRESHER than the
    // scan's t0 disk read — remember the key so applyPartial/commitScan keep the
    // folded rows (an empty fold = deletion, which must also win) instead of
    // clobbering them with the stale stream.
    if (this.coordinator.isScanning()) this.midScanSourceKeys.add(sourceKey)

    const merged = mergeSharedConventions([...retained, ...derivedAssets])
    const stats = computeAssetStats(merged)
    this.snapshot = { ...this.snapshot, assets: merged, stats }
    this.assetMap = new Map(merged.map((asset) => [asset.id, asset]))
    this.selectorCache.clear()
    this.snapshotCache.set(this.projectDir, this.snapshot)
    this.persistFileChange(sourceKey)
    // Emit lean (GH-151 S6) — derived assets carry freshly-parsed raw bodies.
    this.progressListener?.({ status: this.status, partial: { assets: merged.map(stripRaw), stats } })
  }

  /** GH-155 W3: swap scan-stream rows for keys the watcher folded mid-scan — the
   * live snapshot's rows for those keys are fresher than the scan's t0 read. A
   * key whose current rows are gone (deletion fold) simply contributes nothing,
   * so deletion wins too. Identity-preserving when the window is empty. */
  private retainMidScanFolds(incoming: Asset[]): Asset[] {
    if (this.midScanSourceKeys.size === 0) return incoming
    const keys = this.midScanSourceKeys
    const retained = this.snapshot.assets.filter((asset) => {
      const key = assetSourceKey(asset)
      return key !== undefined && keys.has(key)
    })
    const rest = incoming.filter((asset) => {
      const key = assetSourceKey(asset)
      return key === undefined || !keys.has(key)
    })
    if (retained.length === 0 && rest.length === incoming.length) return incoming
    return [...rest, ...retained]
  }

  /** Persist one file's change (GH-151 S5): row-level replacement when the store
   * supports it, full save otherwise. The rows passed are the POST-merge assets
   * of that sourceKey — mergeSharedConventions only collapses same-file assets,
   * so this exactly mirrors the in-memory replacement. Same default-view gate
   * as persistIfDefaultView. */
  private persistFileChange(sourceKey: string): void {
    if (projectSnapshotKey(this.projectDir) !== projectSnapshotKey(this.initialProjectDir)) return
    if (!this.snapshotStore) return
    if (this.snapshotStore.replaceBySourceKey) {
      const rows = this.snapshot.assets.filter((asset) => assetSourceKey(asset) === sourceKey)
      this.snapshotStore.replaceBySourceKey(sourceKey, rows, this.snapshot)
      return
    }
    this.snapshotStore.save(this.snapshot)
  }
}

/** Category counts over the live asset list — recomputed on an incremental file
 * change since the runtime (unlike a full scan) has no worker-computed stats to
 * lean on. Mirrors AssetScanner.computeStats; the AssetStats shape is fixed. */
function computeAssetStats(assets: Asset[]): AssetStats {
  return {
    skills: assets.filter((a) => a.type === 'skill').length,
    mcpServers: assets.filter((a) => a.type === 'mcp-server').length,
    sessions: assets.filter((a) => a.type === 'session').length,
    plugins: assets.filter((a) => a.type === 'plugin').length,
    hooks: assets.filter((a) => a.type === 'hook').length,
    commands: assets.filter((a) => a.type === 'command').length,
    subagents: assets.filter((a) => a.type === 'agent').length
  }
}

/**
 * Keep shallow (other-project) assets when an incoming deep-only set would drop them
 * (GH-113, moved engine-side GH-135). A read landing mid-scan — a deep-only partial —
 * would otherwise flicker the global scope. Keep existing shallow until an incoming
 * set actually carries shallow and replaces it wholesale. Identity-preserving when no
 * shallow needs keeping, so the caller can skip a stats recompute.
 */
function foldKeepingShallow(incoming: Asset[], existing: Asset[]): Asset[] {
  if (incoming.some((a) => a.meta?.scanDepth === 'shallow')) return incoming
  const shallowKept = existing.filter((a) => a.meta?.scanDepth === 'shallow')
  return shallowKept.length > 0 ? [...incoming, ...shallowKept] : incoming
}

/** Normalized per-file replacement key (GH-113). Set by parsers via
 * `dedupePathKey`; the watcher emits the same key so a change replaces exactly
 * the assets that file produced. */
function assetSourceKey(asset: Asset): string | undefined {
  const key = asset.meta?.sourceKey
  return typeof key === 'string' ? key : undefined
}

function countIndexedFiles(assets: Asset[]): number {
  const keys = new Set<string>()
  for (const asset of assets) {
    const key = assetSourceKey(asset) ?? asset.path
    if (key) keys.add(key)
  }
  return keys.size
}

function countScanSourceRows(groups: AgentScanSourceGroup[]): number {
  const keys = new Set<string>()
  for (const group of groups) {
    for (const source of [...group.roots, ...(group.sources ?? [])]) {
      keys.add(source.path)
    }
  }
  return keys.size
}

let runtimeInstance: AgentAssetRuntime | null = null

export function getAssetRuntime(): AgentAssetRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new AgentAssetRuntime({ projectDir: process.cwd() })
  }
  return runtimeInstance
}

/** Construct the singleton runtime with host-provided options (e.g. the snapshot
 * store backed by `app.getPath('userData')`). Call once before first use. (T1) */
export function initAssetRuntime(options: AssetRuntimeOptions = {}): AgentAssetRuntime {
  runtimeInstance = new AgentAssetRuntime(options)
  return runtimeInstance
}

function createDefaultSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}


function sessionMatchesAgentView(asset: Asset, view: AgentView | undefined): boolean {
  // 泛化: 委托共享 matcher — 'all'/'claude'/'codex' 行为不变, 其它值按精确 agentId 过滤
  // (cursor/gemini-cli/… 等全部已扫描 agent 现在也可被过滤)。
  return matchesAgentView(asset.agentId, view)
}

function sessionMatchesProjectFilter(asset: Asset, filter: string): boolean {
  const query = filter.toLowerCase()
  return [
    readString(asset.meta, 'project'),
    readString(asset.meta, 'projectPath'),
    readString(asset.meta, 'projectDirName')
  ].some((value) => value?.toLowerCase().includes(query))
}

function getSessionSortTime(asset: Asset): number {
  for (const key of ['endedAt', 'startedAt', 'modifiedAt']) {
    const value = readString(asset.meta, key)
    if (!value) continue
    const time = new Date(value).getTime()
    if (!Number.isNaN(time)) return time
  }
  return 0
}

// GH-115 T10: 本地标量守卫副本随 toSessionSummary 单源化移除, readString 改 @shared (T7 单源)。
