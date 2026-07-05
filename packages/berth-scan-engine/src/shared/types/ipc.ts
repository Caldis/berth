import type {
  AgentView,
  Asset,
  CostMode,
  AssetScope,
  PricingSourceName,
  AssetStats,
  ScanRoot,
  SessionSummary,
  UsageSummary,
  WatchEvent
} from './asset'
import type { MemoryListResult, MemoryNote } from './memory'
import type { AgentCapabilityPluginListResult } from './agent-plugin'
import type { AppScopeSelection, ProjectScopeCandidate } from '../scope'
import type { DashboardInsights } from './insights'

export interface PlatformInfo {
  platform: NodeJS.Platform
  arch: string
  homeDir: string
  version: string
}

export interface ScanResult {
  assets: Asset[]
  stats: AssetStats
  errors: ScanError[]
}

export interface ProjectScopeActivationResult {
  projectDir?: string
  scanResult: ScanResult
  candidates: ProjectScopeCandidate[]
}

export interface ScanError {
  path: string
  type: string
  message: string
}

export type AssetRuntimeState = 'idle' | 'scanning' | 'ready' | 'stale' | 'error'

export type AssetScanReason =
  | 'startup'
  | 'manual'
  | 'watcher'
  | 'project-scope'
  | 'legacy-scan-all'

export interface AssetScanProgress {
  phase: 'discovering' | 'parsing' | 'indexing' | 'deriving'
  current: number
  total: number
  label?: string
  /** Absolute path of the file currently being scanned (GH-10). Additive/optional:
   * adapters that emit per-file progress set it for the flowing "刷刷刷" feedback;
   * adapter-level ticks leave it undefined. Coalesced (latest-wins) before it
   * crosses the worker→main→renderer boundary so per-file emission can't saturate
   * IPC — see ProgressCoalescer. */
  currentPath?: string
  /** Real assets scanned so far (= partial.assets.length). Engine-computed so the
   * GUI renders a count, not deriving it — single source of truth (GH-135). */
  scannedAssets?: number
  /** Elapsed since scan start (ms). */
  elapsedMs?: number
  /** Estimated time remaining (ms) = max(0, lastScanDurationMs - elapsed). Absent
   * on the first scan (no duration baseline yet) → UI shows indeterminate. */
  etaMs?: number
  /** Throughput: scannedAssets per second. */
  ratePerSec?: number
}

/** Cumulative assets scanned so far, streamed mid-scan so the UI renders
 * already-discovered items before the scan completes (GH-110 P4.6).
 * `raw` is stripped from partial assets to keep structured-clone cost low; the
 * final snapshot retains it. `errorCount` exposes scan errors mid-scan (GH-111). */
export interface AssetScanPartial {
  assets: Asset[]
  stats: AssetStats
  errorCount?: number
}

/** GH-155: background deep-index progress across all projects (queue-level N/M,
 * not per-file). Absent on AssetRuntimeStatus = queue idle / nothing known. */
export interface BackgroundIndexStatus {
  state: 'indexing' | 'revalidating' | 'done' | 'unsupported'
  indexedProjects: number
  totalProjects: number
}

export interface AssetRuntimeStatus {
  state: AssetRuntimeState
  reason?: AssetScanReason
  projectDir?: string
  startedAt?: string
  lastCompletedAt?: string
  stale: boolean
  progress?: AssetScanProgress
  error?: string
  backgroundIndex?: BackgroundIndexStatus
}

export type ScanEngineControlId =
  | 'manual-refresh'
  | 'preset'
  | 'watcher-debounce-ms'
  | 'watcher-min-interval-ms'
  | 'periodic-scan-enabled'
  | 'periodic-scan-interval-ms'
  | 'idle-only'
  | 'idle-threshold-ms'
  | 'scan-concurrency'
  | 'batch-pause-ms'
  | 'content-hash'
  | 'os-throttle-enabled'
  | 'ac-only-full-scan'
  | 'min-free-disk-mb'
  | 'exclude-paths'
  | 'respect-gitignore'
  | 'worker-mode'
  | 'scheduler-mode'
  | 'scheduled-refresh'
  | 'queued-refresh'
  | 'scope-fallback'
  | 'pause'
  | 'cancel'
  | 'persisted-settings'
  // GH-135 G6: runtime-state controls that actually inform the user.
  | 'last-scan-reason'
  | 'last-scan-duration'
  | 'source-groups'

export type ScanEngineControlUnit = 'ms' | 'mode' | 'state'

export type ScanEngineControlKind = 'number' | 'boolean' | 'string-list' | 'enum' | 'readonly'

export type ScanEngineControlGroup = 'preset' | 'schedule' | 'performance' | 'scope' | 'power' | 'watcher'

export interface ScanEngineControlDescriptor {
  id: ScanEngineControlId
  value: string | number | boolean | string[]
  /** Renders the matching control in the settings panel (GH-135). Absent → legacy
   * number/readonly inference by `value` type. */
  kind?: ScanEngineControlKind
  /** Visual grouping in the settings panel so 16 params don't flatten into one list. */
  group?: ScanEngineControlGroup
  /** Allowed values for `kind: 'enum'` (e.g. preset tiers). */
  options?: readonly string[]
  unit?: ScanEngineControlUnit
  editable: boolean
  supported: boolean
  settingKey?: keyof ScanEngineSettings
  min?: number
  max?: number
  step?: number
}

export interface ScanEngineCapabilitySummary {
  workerMode: 'one-shot' | 'long-lived'
  schedulerMode: 'single-flight' | 'single-flight-queued-project-scope' | 'priority-queue'
  scopeMode: 'filter-first' | 'scan-on-miss'
  cacheMode: 'sqlite-swr'
  incrementalFileChanges: boolean
  pauseSupported: boolean
  cancelSupported: boolean
  writableSettingsSupported: boolean
  /** OS-level I/O+CPU throttle applied to the scan helper pid (mac taskpolicy /
   * linux ionice). False on win32 (no native binding yet) or when disabled. (GH-135) */
  osThrottleSupported: boolean
}

export interface ScanEngineSchedulerSnapshot {
  scanning: boolean
  /** User paused the periodic scheduler (GH-135). Pausing also cancels any in-flight
   * scan; resume re-arms the periodic timer. Pause is a scheduler state, not a scan state. */
  paused: boolean
  scheduledRefresh: {
    active: boolean
    reason?: AssetScanReason
    delayMs?: number
    scheduledAt?: string
    dueAt?: string
  }
  queuedRefresh: {
    active: boolean
    reason?: AssetScanReason
  }
  /** Active periodic full-rescan schedule (GH-135). `nextScanAt` is the user-facing
   * "next scan" time; absent when disabled/paused. */
  periodicScan: {
    enabled: boolean
    intervalMs: number
    nextScanAt?: string
  }
  lastWatcherRefreshStartedAt?: string
  /** Last completed full scan's wall-clock duration (ms) — the ETA baseline. */
  lastScanDurationMs?: number
}

export type ScanEngineLimitId =
  | 'metadata-only-sensitive-files'
  | 'third-party-code-not-executed'
  | 'unsupported-plugin-bundled-incremental'

export interface ScanEngineLimitDescriptor {
  id: ScanEngineLimitId
  level: 'info' | 'warning'
  enabled: boolean
}

/** One completed scan's record for the history/trend view (GH-135 G7). The engine
 * stores these raw, oldest→newest; the UI derives intervals / averages / rates and
 * renders the trend chart (engine = source of truth, UI = integration + viz). */
export interface ScanHistoryEntry {
  /** Completion time, ISO 8601. */
  at: string
  /** What triggered this scan. */
  reason: AssetScanReason
  /** Wall-clock scan duration in ms. */
  durationMs: number
  /** Assets indexed by this scan. */
  assetCount: number
  /** Distinct source files indexed. */
  fileCount: number
  /** Errors encountered during this scan. */
  errorCount: number
  /** True when the scan completed; false when it failed. */
  ok: boolean
  /** Project root scanned (absent = global / all home dirs) — the scan's scope. */
  projectDir?: string
  /** Number of scan-source groups (dirs/origins) covered — the scan's breadth. */
  sourceCount: number
}

export interface ScanEngineInfo {
  engine: {
    name: string
    packageName: string
    version: string
  }
  status: AssetRuntimeStatus
  snapshot: {
    id: string
    indexedAssets: number
    indexedFiles: number
    errors: number
    sourceGroups: number
    sourceRows: number
  }
  controls: ScanEngineControlDescriptor[]
  capabilities: ScanEngineCapabilitySummary
  scheduler: ScanEngineSchedulerSnapshot
  limits: ScanEngineLimitDescriptor[]
  /** Recent completed scans, oldest→newest (GH-135 G7). UI charts the trend. */
  scanHistory: ScanHistoryEntry[]
}

export type ScanEnginePreset = 'eco' | 'balanced' | 'performance' | 'custom'

export interface ScanEngineSettings {
  /** Active tuning preset; editing any raw value flips this to 'custom' (GH-135). */
  preset: ScanEnginePreset
  // watcher (existing)
  watcherDebounceMs: number
  watcherMinIntervalMs: number
  // scheduling (B-strategy periodic engine)
  periodicScanEnabled: boolean
  periodicScanIntervalMs: number
  idleOnly: boolean
  idleThresholdMs: number
  // performance / backpressure
  scanConcurrency: number
  batchPauseMs: number
  // power / resource gating
  acOnlyFullScan: boolean
  minFreeDiskMb: number
  // scope (highest leverage)
  excludePaths: string[]
  respectGitignore: boolean
  contentHash: boolean
  // OS-level throttle (helper process; mac/linux only, win is future)
  osThrottleEnabled: boolean
}

export interface AssetSnapshot {
  id: string
  projectDir?: string
  assets: Asset[]
  stats: AssetStats
  errors: ScanError[]
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
  status: AssetRuntimeStatus
}

export interface AgentScanSourceGroup {
  agentId: string
  agentName: string
  installed: boolean
  version?: string
  roots: ScanRoot[]
  sources?: ScanRoot[]
}

export interface SessionListResult {
  sessions: SessionSummary[]
  totalCount: number
}

export type SessionToolEventCategory =
  | 'builtin'
  | 'skill'
  | 'mcp'
  | 'task'
  | 'search'
  | 'web'
  | 'agent'
  | 'file'
  | 'hook'
  | 'other'

export type SessionToolEventStatus = 'pending' | 'success' | 'error' | 'unknown'

export interface SessionToolEvent {
  id: string
  callId?: string
  name: string
  category: SessionToolEventCategory
  status: SessionToolEventStatus
  startedAt: string | null
  endedAt: string | null
  durationMs?: number | null
  summary?: string
  filePaths: string[]
  mcpServer?: string
  mcpTool?: string
  skillName?: string
}

export interface SessionArtifactPlan {
  id: string
  title: string
  path: string
}

export interface SessionArtifactTodo {
  id: string
  title: string
  done: boolean
}

export interface SessionArtifactFile {
  id: string
  path: string
  operation?: string
  count: number
}

export interface SessionArtifactCheckpoint {
  id: string
  title: string
  timestamp: string | null
  fileCount: number
}

export interface SessionArtifacts {
  plans: SessionArtifactPlan[]
  todos: SessionArtifactTodo[]
  files: SessionArtifactFile[]
  checkpoints: SessionArtifactCheckpoint[]
}

export interface SessionModelPricingInfo {
  matchedModel: string
  matchedProvider?: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  cacheReadInputCostPerMillion?: number
  cacheCreationInputCostPerMillion?: number
  reasoningOutputCostPerMillion?: number
  contextWindow?: number
  maxOutputTokens?: number
  source: PricingSourceName
  sourceUrl?: string
  updatedAt?: string
}

export interface SessionModelInfo {
  provider: string | null
  providerSource: 'model-id' | 'pricing-catalog' | 'agent' | 'unknown'
  releaseDate: string | null
  releaseDateSource: 'model-id' | 'model-catalog' | null
  knowledgeCutoff: string | null
  referenceUrl?: string
  pricing: SessionModelPricingInfo | null
}

export type SessionTokenRateSource = 'unavailable'

export interface SessionActivityMetrics {
  tokenRatePerMinute: number | null
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionTokenRateSource
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
  tokenRateTokenCount: number | null
  tokenRateSampleCount: number
  tokenRateIdleGapSeconds: number
}

export interface SessionDetailResult {
  summary: SessionSummary
  modelInfo?: SessionModelInfo
  activityMetrics: SessionActivityMetrics
  skillsUsed: Asset[]
  mcpServers: Asset[]
  hooksFired: { event: string; count: number }[]
  toolTimeline: SessionToolEvent[]
  artifacts: SessionArtifacts
  plans: SessionArtifactPlan[]
  todos: SessionArtifactTodo[]
  fileHistoryCount: number
}

// ── Session replay (GH-116) ──
// Full per-event view of one transcript for the detail-page replay tab.
// Event metas stay light (bounded summaries); raw record payloads are fetched
// per event via `sessions:event-payload` so multi-MB transcripts never cross
// IPC wholesale.

export type SessionReplayEventKind =
  | 'user'
  | 'assistant'
  | 'thinking'
  | 'tool'
  | 'result'
  | 'model'
  | 'system'

export interface SessionReplayTokens {
  input?: number
  output?: number
  cacheRead?: number
  cacheCreation?: number
}

export interface SessionReplayEvent {
  /** `L{line}B{n}` — line index keys the raw-payload lookup. */
  id: string
  kind: SessionReplayEventKind
  timestamp: string | null
  /** Single-line summary, bounded by REPLAY_SUMMARY_MAX (shared/session-replay.ts). */
  summary: string
  toolName?: string
  status?: 'success' | 'error'
  tokens?: SessionReplayTokens
  /** Claude isSidechain — event originated in a subagent thread. */
  sidechain?: boolean
  /** User interrupt (Claude `[Request interrupted by user…]` / Codex `turn_aborted`); set only when true. */
  interrupted?: boolean
}

export interface SessionReplayResult {
  sessionId: string
  agentId: string
  startedAt: string | null
  endedAt: string | null
  events: SessionReplayEvent[]
  /** Real event count before the cap; events holds the most recent slice when truncated. */
  totalEvents: number
  truncated: boolean
}

export interface SessionReplayEventPayload {
  id: string
  /** Raw JSONL line the event was parsed from. */
  json: string
}

export interface SearchResult {
  id: string
  asset: Asset
  score: number
  matches: { field: string; snippet: string }[]
}

export interface HealthCheck {
  id: string
  severity: HealthCheckSeverity
  category: HealthCheckCategory
  agentId: 'all' | 'claude-code' | 'codex'
  agentName: string
  title: string
  message: string
  suggestion?: string
  scope?: AssetScope
  path?: string
  assetId?: string
  assetType?: string
  evidence?: HealthCheckEvidence[]
  fix?: HealthCheckFix
  target?: HealthCheckTarget
  confidence?: HealthCheckConfidence
  /**
   * Stable i18n keys for each prose field, emitted by the engine so the
   * renderer localizes by key instead of reverse-matching English prose
   * (GH #6 Phase-2 messageKey contract). Optional during dual-carry migration.
   */
  i18nKeys?: HealthCheckI18nKeys
  /** Interpolation params for the i18n keys above (e.g. { name, event, field }). */
  params?: Record<string, string | number>
}

export interface HealthCheckI18nKeys {
  title?: string
  message?: string
  suggestion?: string
  fixLabel?: string
  fixDescription?: string
}

export interface HealthCheckRequest {
  refresh?: boolean
}

export type HealthCheckSeverity = 'info' | 'warning' | 'error'

export type HealthCheckConfidence = 'high' | 'medium' | 'low'

export interface HealthCheckEvidence {
  label: string
  url: string
  /** Stable i18n key for `label` (GH #6 Phase-2). Optional during dual-carry. */
  labelKey?: string
}

export interface HealthCheckFix {
  label: string
  description: string
  snippet?: string
}

export interface HealthCheckTarget {
  route?: string
  path?: string
  assetId?: string
}

export type HealthCheckCategory =
  | 'source'
  | 'syntax'
  | 'structure'
  | 'reference'
  | 'configuration'
  | 'session'

export type HooksAgentId = 'claude-code' | 'codex'

export interface SetHookEnabledRequest {
  agentId: HooksAgentId
  scope: 'user'
  hookKey: string
  sourcePath: string
  enabled: boolean
  managed?: boolean
}

export interface SetHookEnabledResult {
  hookKey: string
  enabled: boolean
  changed: boolean
  sourcePath: string
}

export interface ImportChainNode {
  path: string
  content?: string
  imports: ImportChainNode[]
  errors?: string[]
}

// ── Agent Teams (Claude Code experimental runtime collaboration state) ──
// Read-only records parsed from `~/.claude/teams/{name}/` + `~/.claude/tasks/{name}/`.
// Not part of the asset model: team dirs are runtime-generated, expected to be
// removed on cleanup, and routinely left behind — presented as collaboration
// records, never as live state.

export interface AgentTeamMember {
  name: string
  agentId: string
  agentType: string
  model?: string
  /** Normalized from backendType / tmuxPaneId; undefined for the lead (runs in the user's own terminal). */
  backend?: 'in-process' | 'tmux'
  prompt?: string
  color?: string
  joinedAt?: number
}

export interface AgentTeamTask {
  id: string
  subject: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'unknown'
  owner?: string
  blockedBy: string[]
}

export interface AgentTeamSummary {
  name: string
  description?: string
  dirPath: string
  createdAt: number | null
  /** max mtime across config / inbox / task files — recency signal, not a liveness claim. */
  lastActivityAt: number | null
  leadAgentId?: string
  leadSessionId?: string
  /** True when the lead session's transcript is present in the current asset snapshot. */
  leadSessionAvailable: boolean
  members: AgentTeamMember[]
  tasks: AgentTeamTask[]
  inboxMessageCount: number
  lastInboxMessageAt: number | null
}

export interface AgentTeamListResult {
  teams: AgentTeamSummary[]
}

/**
 * IPC Channel definitions — the contract between main and renderer.
 * Main process implements handlers; preload exposes typed wrappers.
 *
 * GH-115 T1: 本表是四方对账真源 (tests/unit/ipc-contract.test.ts):
 * handlers 注册 == preload invoke == 本表键集 == tests/setup.ts mock。
 * 通道增删必须四方同批; 表内容照实登记 (含 T2 待删死通道, 见对账测试白名单)。
 */
export interface IpcChannels {
  'window:minimize': { args: []; result: void }
  'window:toggle-maximize': { args: []; result: void }
  'window:close': { args: []; result: void }
  'window:is-maximized': { args: []; result: boolean }
  'window:set-always-on-top': { args: [boolean]; result: void }
  'window:is-always-on-top': { args: []; result: boolean }
  'platform:info': { args: []; result: PlatformInfo }
  'assets:snapshot': { args: []; result: AssetSnapshot }
  'assets:status': { args: []; result: AssetRuntimeStatus }
  'assets:engine-info': { args: []; result: ScanEngineInfo }
  'assets:set-engine-settings': { args: [Partial<ScanEngineSettings>]; result: ScanEngineInfo }
  'assets:refresh': { args: [{ wait?: boolean }?]; result: AssetRuntimeStatus }
  'assets:pause': { args: []; result: ScanEngineInfo }
  'assets:resume': { args: []; result: ScanEngineInfo }
  'assets:cancel': { args: []; result: AssetRuntimeStatus }
  'assets:rebuild': { args: [{ wait?: boolean }?]; result: AssetRuntimeStatus }
  'assets:scan-sources': { args: []; result: AgentScanSourceGroup[] }
  'agent-plugins:list': { args: []; result: AgentCapabilityPluginListResult }
  'project-scope:candidates': { args: []; result: ProjectScopeCandidate[] }
  'project-scope:activate': { args: [{ projectPath?: string }]; result: ProjectScopeActivationResult }
  'project-scope:set-scope': { args: [AppScopeSelection]; result: { applied: boolean } }
  'assets:get': { args: [string]; result: Asset | null }
  'assets:search': { args: [string]; result: SearchResult[] }
  'assets:health-check': { args: [HealthCheckRequest?]; result: HealthCheck[] }
  'sessions:list': { args: [{ projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }]; result: SessionListResult }
  'sessions:get': { args: [string]; result: SessionDetailResult | null }
  'sessions:events': { args: [string]; result: SessionReplayResult | null }
  'sessions:event-payload': { args: [string, string]; result: SessionReplayEventPayload | null }
  'usage:summary': { args: [{ days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }]; result: UsageSummary }
  'insights:dashboard': { args: [{ days?: number; agentView?: AgentView; projectPath?: string }?]; result: DashboardInsights }
  'memory:list': { args: []; result: MemoryListResult }
  'memory:get': { args: [string]; result: MemoryNote | null }
  'teams:list': { args: []; result: AgentTeamListResult }
  'hooks:set-hook-enabled': { args: [SetHookEnabledRequest]; result: SetHookEnabledResult }
  'theme:set': { args: ['light' | 'dark' | 'system']; result: void }
  'shell:openPath': { args: [string]; result: void }
  'shell:openExternal': { args: [string]; result: void }
  /** Native directory picker for the scan-exclude list (GH-135 G4). Returns the
   * chosen absolute dir paths, or [] when the user cancels. */
  'dialog:open-directory': { args: []; result: string[] }
  'update:check': { args: []; result: void }
  'update:download': { args: []; result: void }
  'update:install': { args: []; result: void }
  'update:get-preferences': { args: []; result: UpdatePreferences }
  'update:set-preferences': { args: [UpdatePreferences]; result: void }
}

/** Auto-update preferences persisted in userData (GH-124, GH-134). */
export interface UpdatePreferences {
  /** Auto-check for updates on launch; default true (GH-134). */
  autoCheck: boolean
  /** Download an available update in the background; default false. */
  autoDownload: boolean
  /** Receive GitHub pre-releases (beta channel); default false (GH-134). */
  allowPrerelease: boolean
}

/** One release-notes entry. With `fullChangelog` enabled the GitHub provider
 * returns every release between the running and the target version (GH-156).
 * `note` is the raw Atom-feed HTML — renderers must extract text, never inject. */
export interface UpdateReleaseNote {
  version: string
  note: string
}

/** Aggregated auto-update state pushed over the single `update:state` event
 * (GH-124). All platforms (incl. signed macOS, GH-134) run real download/install. */
export interface UpdateState {
  phase: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: UpdateReleaseNote[]
  percent?: number
  error?: string
}

/** Events pushed from main → renderer。payload 必须对实发 site 核验照实:
 * maximized-change 实发裸 boolean (src/main/index.ts:58); assets:changed 实发 WatchEvent (index.ts:145);
 * assets:progress 实发 AssetProgressPayload (runtime.ts:33)。改表先查 send 调用点, 不信旧表。 */
export interface IpcEvents {
  'window:maximized-change': boolean
  'assets:changed': WatchEvent
  /** Live scan status + cumulative partial assets pushed during a scan (P4.6). */
  'assets:progress': { status: AssetRuntimeStatus; partial?: AssetScanPartial }
  /** Auto-update state machine, broadcast from main (GH-124, src/main/index.ts). */
  'update:state': UpdateState
}

/** Typed helper aliases — preload 的 invoke 包装与未来 handlers 类型化共用。 */
export type IpcChannelArgs<C extends keyof IpcChannels> = IpcChannels[C]['args']
export type IpcChannelResult<C extends keyof IpcChannels> = IpcChannels[C]['result']
