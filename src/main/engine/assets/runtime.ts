import type { AgentView, Asset, AssetStats, CostMode, SessionSummary, UsageSummary } from '@shared/types/asset'
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
import { assetMatchesAppScope, DEFAULT_SCOPE_SELECTION, normalizeProjectPathKey, normalizeScopeSelection } from '@shared/scope'
import { normalizeTokenUsage } from '@shared/token-usage'
import { assetMatchesProjectPath } from '../../project-scope'
import { runHealthChecks } from '../health'
import { getSearch } from '../search'
import { buildUsageSummary } from '../usage'
import { WorkerAssetScanner } from './worker-host'

export interface AssetRuntimeScanOptions {
  onProgress?: (progress: AssetScanProgress) => void
  onPartial?: (partial: AssetScanPartial) => void
}

/** Pushed to the main process on every progress tick / partial during a scan so
 * it can forward live status + already-scanned assets to the renderer (P4.6). */
export interface AssetProgressPayload {
  status: AssetRuntimeStatus
  partial?: AssetScanPartial
}

export interface AssetRuntimeScanner {
  scanAll(options?: AssetRuntimeScanOptions): Promise<ScanResult>
  getScanSourceGroups(): Promise<AgentScanSourceGroup[]>
  getProjectScopeCandidates(): ProjectScopeCandidate[]
  getProjectDir(): string | undefined
}

export interface AssetRefreshOptions {
  reason?: AssetScanReason
  wait?: boolean
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
}

export interface AssetSelectorCache {
  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T
  clear(): void
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

class SnapshotSelectorCache implements AssetSelectorCache {
  private readonly values = new Map<string, { snapshotId: string; value: unknown }>()

  select<T>(key: string, snapshot: AssetSnapshot, derive: (snapshot: AssetSnapshot) => T): T {
    const cached = this.values.get(key)
    if (cached?.snapshotId === snapshot.id) return cached.value as T

    const value = derive(snapshot)
    this.values.set(key, { snapshotId: snapshot.id, value })
    return value
  }

  clear(): void {
    this.values.clear()
  }
}

/**
 * Scope predicate for server-side reads (search) in the current per-project
 * snapshot architecture. A project-mode snapshot already holds only the active
 * project's project-scoped assets (its full inheritance chain), so those — plus
 * user/enterprise — pass through unfiltered. Sessions are the exception: every
 * project's sessions live in every snapshot, so in non-global modes they must be
 * filtered to the selected scope (via the shared assetMatchesAppScope) to avoid
 * cross-project leakage. Owner-based filtering of project-scoped assets lands
 * with the global multi-project snapshot in T3. (GH-113 T2)
 */
function searchScopeAllows(asset: Asset, selection: AppScopeSelection): boolean {
  if (selection.mode === 'user') return asset.scope === 'user' || asset.scope === 'enterprise'
  if (asset.type === 'session') return assetMatchesAppScope(asset, selection)
  return true
}

/** Stable per-project cache key (normalized; empty for no/global project). */
function projectKey(projectDir?: string): string {
  return projectDir ? normalizeProjectPathKey(projectDir) : ''
}

export class AgentAssetRuntime {
  private projectDir?: string
  private scopeSelection: AppScopeSelection = DEFAULT_SCOPE_SELECTION
  // Per-project snapshot cache: re-selecting an already-scanned project serves
  // its snapshot instantly (no rescan). The watcher keeps the active project fresh.
  private readonly snapshotCache = new Map<string, AssetSnapshot>()
  private scanner: AssetRuntimeScanner
  private snapshot: AssetSnapshot
  private status: AssetRuntimeStatus
  private assetMap = new Map<string, Asset>()
  private inFlight: Promise<void> | null = null
  private readonly selectorCache: AssetSelectorCache
  private readonly createScanner: (projectDir?: string) => AssetRuntimeScanner
  private readonly now: () => string
  private readonly createSnapshotId: () => string
  private progressListener?: (payload: AssetProgressPayload) => void

  constructor(options: AssetRuntimeOptions = {}) {
    this.projectDir = options.projectDir
    this.createScanner = options.createScanner ?? ((projectDir) => new WorkerAssetScanner(projectDir))
    this.now = options.now ?? (() => new Date().toISOString())
    this.createSnapshotId = options.createSnapshotId ?? createDefaultSnapshotId
    this.scanner = this.createScanner(this.projectDir)
    this.selectorCache = new SnapshotSelectorCache()
    this.status = this.createIdleStatus()
    this.snapshot = this.createInitialSnapshot()
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
    return this.snapshotCache.has(projectKey(projectDir))
  }

  setProjectDir(projectDir?: string): void {
    if (this.projectDir === projectDir) return

    this.projectDir = projectDir
    this.scanner = this.createScanner(projectDir)
    this.selectorCache.clear()

    // Serve a cached snapshot for this project instantly (sub-second switching).
    const cached = this.snapshotCache.get(projectKey(projectDir))
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
    if (this.inFlight) {
      if (options.wait) await this.inFlight
      return this.status
    }

    const reason = options.reason ?? 'manual'
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

    this.inFlight = this.runRefresh(reason)
    if (options.wait) await this.inFlight
    return this.status
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
    return this.select(`search:${scopeKey}:${query}`, () =>
      getSearch()
        .search(query, snapshot.assets)
        .filter((result) => searchScopeAllows(result.asset, sel))
    )
  }

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

  private async runRefresh(reason: AssetScanReason): Promise<void> {
    // Capture the scanner generation. setProjectDir() can swap `this.scanner`
    // (and serve a cached snapshot) while this scan is awaiting — committing the
    // old scan's result afterwards would clobber the newly-selected project with
    // stale assets. Guard every state write on the scanner still being current. (GH-111 R4)
    const scanner = this.scanner
    const isCurrent = (): boolean => this.scanner === scanner
    try {
      const scanResult = await scanner.scanAll({
        onProgress: (progress) => { if (isCurrent()) this.setProgress(progress) },
        onPartial: (partial) => { if (isCurrent()) this.applyPartial(partial) }
      })
      if (!isCurrent()) return
      const sources = await scanner.getScanSourceGroups()
      const projectCandidates = scanner.getProjectScopeCandidates()
      const projectDir = scanner.getProjectDir() ?? this.projectDir
      if (!isCurrent()) return
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
        assets: scanResult.assets,
        stats: scanResult.stats,
        errors: scanResult.errors,
        sources,
        projectCandidates,
        status
      }
      this.assetMap = new Map(scanResult.assets.map((asset) => [asset.id, asset]))
      this.snapshotCache.set(projectKey(projectDir), this.snapshot)
      this.selectorCache.clear()
      // Emit the terminal status on the SAME progress channel as the live ticks
      // so the renderer's last event is authoritative. Without this, a trailing
      // "scanning" progress macrotask can clobber the `ready` set by the
      // refresh() reply microtask, leaving the UI stuck at scanning (P4.6 fix).
      this.progressListener?.({ status })
    } catch (error) {
      // A scan whose project was switched away mid-flight must not mark the
      // newly-selected project as errored. (GH-111 R4)
      if (!isCurrent()) return
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
    } finally {
      this.inFlight = null
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
}

let runtimeInstance: AgentAssetRuntime | null = null

export function getAssetRuntime(): AgentAssetRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new AgentAssetRuntime({ projectDir: process.cwd() })
  }
  return runtimeInstance
}

export function initAssetRuntime(projectDir?: string): AgentAssetRuntime {
  runtimeInstance = new AgentAssetRuntime({ projectDir })
  return runtimeInstance
}

function createDefaultSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function toSessionSummary(asset: Asset): SessionSummary {
  const tokenUsage = normalizeTokenUsage(asset.meta.tokenUsage ?? asset.meta)
  return {
    id: asset.id,
    agentId: asset.agentId,
    title: asset.name,
    project: readString(asset.meta, 'project') ?? '',
    projectPath: readString(asset.meta, 'projectPath') ?? '',
    transcriptPath: readString(asset.meta, 'transcriptPath') ?? asset.path,
    startedAt: readString(asset.meta, 'startedAt') ?? null,
    endedAt: readString(asset.meta, 'endedAt') ?? null,
    duration: readNumber(asset.meta, 'duration') ?? null,
    cost: readNumber(asset.meta, 'totalCost') ?? null,
    tokens: tokenUsage.totalTokens,
    tokenUsage,
    model: readString(asset.meta, 'model') ?? '',
    skillsUsed: readStringArray(asset.meta, 'skillsUsed'),
    mcpServers: readStringArray(asset.meta, 'mcpServers'),
    hooksFired: readNumber(asset.meta, 'hooksFired') ?? 0
  }
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

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
