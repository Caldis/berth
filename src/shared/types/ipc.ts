import type {
  AgentView,
  Asset,
  AssetCategory,
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

export interface ScanError {
  path: string
  type: string
  message: string
}

export interface AgentScanSourceGroup {
  agentId: string
  agentName: string
  installed: boolean
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

export interface SessionDetailResult {
  summary: SessionSummary
  modelInfo?: SessionModelInfo
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

export type HookRecoveryStatus = 'recoverable' | 'source-missing' | 'already-restored' | 'invalid'

export interface HookRecoveryPoint {
  hookKey: string
  agentId: 'claude-code'
  agentName: string
  sourcePath: string
  scope: 'user'
  event: string
  matcher?: string
  hookType: string
  command?: string
  summary: string
  createdAt?: string
  status: HookRecoveryStatus
  message?: string
}

export interface HookRecoveryIssue {
  agentId: HooksAgentId
  sourcePath: string
  severity: 'warning' | 'error'
  message: string
}

export interface HookRecoveryListResult {
  points: HookRecoveryPoint[]
  issues: HookRecoveryIssue[]
}

export interface ClearHookRecoveryRequest {
  agentId: 'claude-code'
  hookKey: string
  sourcePath: string
}

export interface ClearHookRecoveryResult {
  hookKey: string
  sourcePath: string
  changed: boolean
}

export interface ImportChainNode {
  path: string
  content?: string
  imports: ImportChainNode[]
  errors?: string[]
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
  'platform:info': { args: []; result: PlatformInfo }
  'assets:scan-all': { args: []; result: ScanResult }
  'assets:scan-sources': { args: []; result: AgentScanSourceGroup[] }
  'assets:scan-category': { args: [AssetCategory]; result: Asset[] }
  'assets:get': { args: [string]; result: Asset | null }
  'assets:relations': { args: [string]; result: Relation[] }
  'assets:search': { args: [string]; result: SearchResult[] }
  'assets:health-check': { args: []; result: HealthCheck[] }
  'assets:import-chain': { args: [string]; result: ImportChainNode }
  'sessions:list': { args: [{ projectFilter?: string; limit?: number; agentView?: AgentView }]; result: SessionListResult }
  'sessions:get': { args: [string]; result: SessionDetailResult | null }
  'usage:summary': { args: [{ days: number; agentView?: AgentView; costMode?: CostMode }]; result: UsageSummary }
  'memory:list': { args: []; result: MemoryListResult }
  'memory:get': { args: [string]; result: MemoryNote | null }
  'mcp:merged': { args: []; result: MCPMergeInfo[] }
  'hooks:status': { args: [HooksAgentId]; result: HooksEnablementStatus }
  'hooks:statuses': { args: [HooksAgentId]; result: HooksEnablementStatus[] }
  'hooks:set-enabled': { args: [SetHooksEnabledRequest]; result: SetHooksEnabledResult }
  'hooks:set-hook-enabled': { args: [SetHookEnabledRequest]; result: SetHookEnabledResult }
  'hooks:recoveries': { args: []; result: HookRecoveryListResult }
  'hooks:clear-recovery': { args: [ClearHookRecoveryRequest]; result: ClearHookRecoveryResult }
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
}
