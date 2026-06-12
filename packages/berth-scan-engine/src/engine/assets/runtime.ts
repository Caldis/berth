import type { AgentView, Asset, AssetStats, CostMode, UsageSummary } from '@shared/types/asset'
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
  ScanResult
} from '@shared/types/ipc'
import type { AppScopeSelection, ProjectScopeCandidate } from '@shared/scope'
import { assetMatchesAppScope, DEFAULT_SCOPE_SELECTION, normalizeScopeSelection } from '@shared/scope'
import { assetMatchesProjectPath } from '../../project-scope'
import { runHealthChecks } from '../health'
import { getSearch } from '../search'
import { buildUsageSummary } from '../usage'
import { WorkerAssetScanner } from './worker-host'
import { mergeSharedConventions } from '../scanner'
import { toSessionSummary } from '../session-detail'
import { readString } from '@shared/object-guards'
import type { SnapshotStore } from './snapshot-store'
import { SnapshotSelectorCache, type AssetSelectorCache } from './selector-cache'
import { ProjectSnapshotCache, projectSnapshotKey } from './project-snapshot-cache'
import { ScanCoordinator, type AssetRuntimeScanner, type ScanOutcome, type ScanSink } from './scan-coordinator'

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

export interface AssetRuntimeOptions {
  projectDir?: string
  createScanner?: (projectDir?: string) => AssetRuntimeScanner
  now?: () => string
  createSnapshotId?: () => string
  /** Persists the snapshot for instant cold-start (GH-113 T1). Injected by the
   * host with `app.getPath('userData')`; absent in tests that don't exercise it. */
  snapshotStore?: SnapshotStore
}

const EMPTY_ASSET_STATS: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0
}

export const WATCHER_REFRESH_DEBOUNCE_MS = 1_000
export const WATCHER_REFRESH_MIN_INTERVAL_MS = 30_000

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
  private readonly initialProjectDir?: string
  private progressListener?: (payload: AssetProgressPayload) => void
  private scheduledRefreshTimer: ReturnType<typeof setTimeout> | null = null
  private lastWatcherRefreshStartedAtMs = 0

  constructor(options: AssetRuntimeOptions = {}) {
    this.projectDir = options.projectDir
    this.initialProjectDir = options.projectDir
    this.now = options.now ?? (() => new Date().toISOString())
    this.createSnapshotId = options.createSnapshotId ?? createDefaultSnapshotId
    this.snapshotStore = options.snapshotStore
    this.coordinator = new ScanCoordinator(
      options.createScanner ?? ((projectDir) => new WorkerAssetScanner(projectDir)),
      this.projectDir
    )
    this.selectorCache = new SnapshotSelectorCache()
    this.status = this.createIdleStatus()
    this.snapshot = this.createInitialSnapshot()
    this.restorePersistedSnapshot()
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
    this.assetMap = new Map(persisted.assets.map((asset) => [asset.id, asset]))
    this.snapshotCache.set(this.projectDir, this.snapshot)
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

  getScanResult(): ScanResult {
    return {
      assets: this.snapshot.assets,
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
      this.status = { ...cached.status, projectDir, state: 'ready', stale: false }
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
      if (options.wait) await this.coordinator.wait()
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

    const run = this.coordinator.run(this.createScanSink(reason))
    if (options.wait) await run
    return this.status
  }

  scheduleRefresh(options: AssetScheduledRefreshOptions = {}): void {
    const reason = options.reason ?? 'manual'
    const delayMs = Math.max(0, options.delayMs ?? (reason === 'watcher' ? WATCHER_REFRESH_DEBOUNCE_MS : 0))
    const minIntervalMs = Math.max(0, options.minIntervalMs ?? (reason === 'watcher' ? WATCHER_REFRESH_MIN_INTERVAL_MS : 0))
    const elapsedSinceWatcherRefresh = this.lastWatcherRefreshStartedAtMs > 0
      ? Math.max(0, Date.now() - this.lastWatcherRefreshStartedAtMs)
      : minIntervalMs
    const rateLimitDelayMs = reason === 'watcher'
      ? Math.max(0, minIntervalMs - elapsedSinceWatcherRefresh)
      : 0
    const scheduledDelayMs = Math.max(delayMs, rateLimitDelayMs)

    this.clearScheduledRefresh()
    this.scheduledRefreshTimer = setTimeout(() => {
      this.scheduledRefreshTimer = null
      void this.refresh({ reason, wait: options.wait })
    }, scheduledDelayMs)
  }

  select<T>(key: string, derive: (snapshot: AssetSnapshot) => T): T {
    return this.selectorCache.select(key, this.snapshot, derive)
  }

  async ensureReady(options: AssetRuntimeEnsureOptions = {}): Promise<AssetSnapshot> {
    if (options.refresh || this.status.state === 'idle' || this.status.state === 'stale') {
      await this.refresh({ reason: options.reason ?? 'manual', wait: true })
      return this.snapshot
    }
    if (this.status.state === 'scanning') {
      await this.refresh({ wait: true })
      return this.snapshot
    }
    if (this.status.state === 'error' && this.snapshot.id === 'initial') {
      await this.refresh({ reason: options.reason ?? 'manual', wait: true })
    }
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
    const projectDir = outcome.projectDir ?? this.projectDir
    const status: AssetRuntimeStatus = {
      state: 'ready',
      reason,
      projectDir,
      startedAt: this.status.startedAt,
      lastCompletedAt: this.now(),
      stale: false
    }

    this.projectDir = projectDir
    this.status = status
    this.snapshot = {
      id: this.createSnapshotId(),
      projectDir,
      assets: outcome.scanResult.assets,
      stats: outcome.scanResult.stats,
      errors: outcome.scanResult.errors,
      sources: outcome.sources,
      projectCandidates: outcome.projectCandidates,
      status
    }
    this.assetMap = new Map(outcome.scanResult.assets.map((asset) => [asset.id, asset]))
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
    this.progressListener?.({ status: this.status })
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
    if (!this.scheduledRefreshTimer) return
    clearTimeout(this.scheduledRefreshTimer)
    this.scheduledRefreshTimer = null
  }

  private setProgress(progress: AssetScanProgress): void {
    this.status = {
      ...this.status,
      progress
    }
    this.snapshot = {
      ...this.snapshot,
      status: this.status
    }
    this.progressListener?.({ status: this.status })
  }

  /**
   * Fold a cumulative partial into the live snapshot so the renderer can show
   * already-scanned assets mid-scan. The snapshot id is deliberately kept stable
   * (only `runRefresh` mints a fresh id on completion) so id-keyed consumers like
   * the plugin list don't re-fetch on every partial.
   */
  private applyPartial(partial: AssetScanPartial): void {
    this.snapshot = {
      ...this.snapshot,
      assets: partial.assets,
      stats: partial.stats
    }
    this.assetMap = new Map(partial.assets.map((asset) => [asset.id, asset]))
    this.progressListener?.({ status: this.status, partial })
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

    const merged = mergeSharedConventions([...retained, ...derivedAssets])
    const stats = computeAssetStats(merged)
    this.snapshot = { ...this.snapshot, assets: merged, stats }
    this.assetMap = new Map(merged.map((asset) => [asset.id, asset]))
    this.selectorCache.clear()
    this.snapshotCache.set(this.projectDir, this.snapshot)
    this.persistIfDefaultView(this.projectDir)
    this.progressListener?.({ status: this.status, partial: { assets: merged, stats } })
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

/** Normalized per-file replacement key (GH-113). Set by parsers via
 * `dedupePathKey`; the watcher emits the same key so a change replaces exactly
 * the assets that file produced. */
function assetSourceKey(asset: Asset): string | undefined {
  const key = asset.meta?.sourceKey
  return typeof key === 'string' ? key : undefined
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
  if (!view || view === 'all') return true
  if (view === 'claude') return asset.agentId === 'claude-code' || asset.agentId === 'claude'
  return asset.agentId === 'codex'
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
