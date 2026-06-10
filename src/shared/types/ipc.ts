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
  Relation
} from './asset'
import type { MemoryListResult, MemoryNote } from './memory'
import type { AgentCapabilityPluginListResult } from './agent-plugin'
import type { AppScopeSelection, ProjectScopeCandidate } from '../scope'

export interface PlatformInfo {
  platform: NodeJS.Platform
  arch: string
  homeDir: string
  version: string
  claudeDir: string
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

export interface AssetRuntimeStatus {
  state: AssetRuntimeState
  reason?: AssetScanReason
  projectDir?: string
  startedAt?: string
  lastCompletedAt?: string
  stale: boolean
  progress?: AssetScanProgress
  error?: string
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
}

export interface HealthCheckRequest {
  refresh?: boolean
}

export type HealthCheckSeverity = 'info' | 'warning' | 'error'

export type HealthCheckConfidence = 'high' | 'medium' | 'low'

export interface HealthCheckEvidence {
  label: string
  url: string
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

export interface MCPMergeInfo {
  serverId: string
  name: string
  scopes: { scope: string; source: string; config: Record<string, unknown> }[]
  effective: Record<string, unknown>
  hasConflict: boolean
  overriddenBy?: string
}

export type HooksAgentId = 'claude-code' | 'codex'

export interface HooksEnablementStatus {
  agentId: HooksAgentId
  agentName: string
  scope: 'user' | 'project'
  enabled: boolean
  sourcePath: string
  sourceExists: boolean
  supported: boolean
  writable?: boolean
  reason?: string
  reasonKey?: string
}

export interface SetHooksEnabledRequest {
  agentId: HooksAgentId
  scope: 'user'
  enabled: boolean
}

export interface SetHooksEnabledResult {
  status: HooksEnablementStatus
  changed: boolean
}

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
 */
export interface IpcChannels {
  'window:minimize': { args: []; result: void }
  'window:toggle-maximize': { args: []; result: void }
  'window:close': { args: []; result: void }
  'window:is-maximized': { args: []; result: boolean }
  'window:set-always-on-top': { args: [boolean]; result: void }
  'window:is-always-on-top': { args: []; result: boolean }
  'platform:info': { args: []; result: PlatformInfo }
  'assets:scan-all': { args: []; result: ScanResult }
  'assets:scan-sources': { args: []; result: AgentScanSourceGroup[] }
  'agent-plugins:list': { args: []; result: AgentCapabilityPluginListResult }
  'project-scope:candidates': { args: []; result: ProjectScopeCandidate[] }
  'project-scope:activate': { args: [{ projectPath?: string }]; result: ProjectScopeActivationResult }
  'project-scope:set-scope': { args: [AppScopeSelection]; result: { applied: boolean } }
  'assets:get': { args: [string]; result: Asset | null }
  'assets:relations': { args: [string]; result: Relation[] }
  'assets:search': { args: [string]; result: SearchResult[] }
  'assets:health-check': { args: [HealthCheckRequest?]; result: HealthCheck[] }
  'assets:import-chain': { args: [string]; result: ImportChainNode }
  'sessions:list': { args: [{ projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }]; result: SessionListResult }
  'sessions:get': { args: [string]; result: SessionDetailResult | null }
  'usage:summary': { args: [{ days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }]; result: UsageSummary }
  'memory:list': { args: []; result: MemoryListResult }
  'memory:get': { args: [string]; result: MemoryNote | null }
  'teams:list': { args: []; result: AgentTeamListResult }
  'mcp:merged': { args: []; result: MCPMergeInfo[] }
  'hooks:status': { args: [HooksAgentId]; result: HooksEnablementStatus }
  'hooks:set-enabled': { args: [SetHooksEnabledRequest]; result: SetHooksEnabledResult }
  'hooks:set-hook-enabled': { args: [SetHookEnabledRequest]; result: SetHookEnabledResult }
  'theme:get': { args: []; result: string }
  'theme:set': { args: ['light' | 'dark' | 'system']; result: void }
  'shell:openPath': { args: [string]; result: void }
  'shell:openExternal': { args: [string]; result: void }
}

/** Events pushed from main → renderer */
export interface IpcEvents {
  'window:maximized-change': { maximized: boolean }
  'assets:changed': { type: 'added' | 'changed' | 'removed'; assetId: string; asset?: Asset }
  'scan:progress': { phase: string; current: number; total: number }
  /** Live scan status + cumulative partial assets pushed during a scan (P4.6). */
  'assets:progress': { status: AssetRuntimeStatus; partial?: AssetScanPartial }
}
