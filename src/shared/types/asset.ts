export type AssetCategory =
  | 'instruction'
  | 'capability'
  | 'state'
  | 'observability'
  | 'integration'

export type AssetScope = 'user' | 'project' | 'enterprise' | 'session'

export type AgentView = 'all' | 'claude' | 'codex'

export type ScanSourceKind = 'directory' | 'file' | 'policy'

export type ScanSourceStatus = 'scanned' | 'missing' | 'not-scanned'

export type BuiltInScanSourceCode =
  | 'claude.user.data-directory'
  | 'claude.user.global-config'
  | 'claude.project.directory'
  | 'claude.project.mcp-config'
  | 'claude.enterprise.managed-settings'
  | 'claude.enterprise.managed-mcp'
  | 'codex.user.config'
  | 'codex.user.hooks'
  | 'codex.user.agents-md'
  | 'codex.user.agents-directory'
  | 'codex.user.codex-home-skills'
  | 'codex.user.shared-skills'
  | 'codex.user.sessions'
  | 'codex.session.archived-sessions'
  | 'codex.project.agents-md'
  | 'codex.project.config'
  | 'codex.project.hooks'
  | 'codex.project.agents-directory'
  | 'codex.project.skills'
  | 'project.current-candidate'
  | 'project.session-derived-candidate'

export type ScanSourceCode = BuiltInScanSourceCode | string

export type AssetType =
  | 'claude-md'
  | 'agents-md'
  | 'skill'
  | 'agent'
  | 'command'
  | 'output-mode'
  | 'mcp-server'
  | 'hook'
  | 'plugin'
  | 'marketplace'
  | 'statusline'
  | 'permission'
  | 'env'
  | 'session'
  | 'plan'
  | 'todo'
  | 'file-history'
  | 'history'
  | 'shell-snapshot'
  | 'stats-cache'
  | 'usage-data'
  | 'statsig'
  | 'debug'
  | 'ide-lock'
  | 'credential'
  | 'worktree'
  | 'backup'

export interface Asset {
  id: string
  agentId: string
  category: AssetCategory
  type: AssetType
  scope: AssetScope
  name: string
  path: string
  meta: Record<string, unknown>
  raw?: string
  sensitive?: boolean
}

export type RelationKind =
  | 'imports'
  | 'uses'
  | 'contains'
  | 'triggered-by'
  | 'belongs-to'

export interface Relation {
  from: string
  to: string
  kind: RelationKind
}

export interface ScanRoot {
  path: string
  scope: AssetScope
  code?: ScanSourceCode
  description?: string
  summary?: string
  categories?: AssetCategory[]
  kind?: ScanSourceKind
  status?: ScanSourceStatus
  reason?: string
}

export interface DetectResult {
  installed: boolean
  version?: string
  paths: ScanRoot[]
}

export interface WatchEvent {
  type: 'added' | 'changed' | 'removed'
  assetId: string
  asset?: Asset
}

export interface AgentAdapter {
  readonly id: string
  readonly displayName: string
  detect(): Promise<DetectResult>
  scanRoots(): Promise<ScanRoot[]>
  scanSourceCoverage?(): Promise<ScanRoot[]>
  scanAll(): Promise<{ assets: Asset[]; errors: { path: string; type: string; message: string }[] }>
  scanAssets(category: AssetCategory): Promise<Asset[]>
  watchAssets(callback: (event: WatchEvent) => void): { dispose(): void }
  resolveRelations(asset: Asset): Promise<Relation[]>
}

export interface AssetStats {
  skills: number
  mcpServers: number
  sessions: number
  plugins: number
  hooks: number
  commands: number
  subagents: number
}

export interface SessionSummary {
  id: string
  agentId: string
  title: string
  project: string
  projectPath: string
  transcriptPath: string
  startedAt: string | null
  endedAt: string | null
  duration: number | null
  cost: number | null
  tokens: number
  tokenUsage: TokenUsageBreakdown
  model: string
  skillsUsed: string[]
  mcpServers: string[]
  hooksFired: number
}

export interface TokenUsageBreakdown {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  reasoningOutputTokens: number
  unknownTokens: number
  totalTokens: number
  hasBreakdown: boolean
}

export type CostSource = 'actual' | 'estimated' | 'mixed' | 'unknown'

export type CostMode = 'auto' | 'actual' | 'estimated'

export type UsageCostFormula = 'actual' | 'estimated' | 'mixed' | 'unknown'

export type PricingSourceName = 'litellm' | 'models.dev' | 'local'

export type PricingMissReason =
  | 'missing-model-pricing'
  | 'missing-token-breakdown'
  | 'missing-price-component'

export interface PricingMiss {
  model: string | null
  reason: PricingMissReason
  tokens: number
  count: number
}

export interface UsagePricingSourceSummary {
  source: PricingSourceName
  sourceUrl?: string
  updatedAt?: string
  count: number
}

export interface PricingCatalogInfo {
  generatedAt?: string
  sources: { name: PricingSourceName; url: string; fetchedAt: string }[]
}

export interface UsageCostExplanation {
  formula: UsageCostFormula
  pricingSources: UsagePricingSourceSummary[]
  catalog: PricingCatalogInfo
}

export interface UsageCostDetails {
  actualCost: number
  estimatedCost: number
  costDelta: number
}

export interface UsageDimensionCost extends UsageCostDetails {
  costSource: CostSource
  pricingMisses: PricingMiss[]
}

export interface UsageModelBreakdown extends UsageDimensionCost {
  model: string
  percentage: number
  cost: number
  tokens: number
  tokenUsage: TokenUsageBreakdown
}

export interface UsageProjectBreakdown extends UsageDimensionCost {
  project: string
  percentage: number
  cost: number
  tokens: number
  tokenUsage: TokenUsageBreakdown
}

export interface UsageSummary {
  costMode: CostMode
  totalCost: number
  actualCost: number
  estimatedCost: number
  costDelta: number
  costExplanation: UsageCostExplanation
  totalTokens: number
  tokenUsage: TokenUsageBreakdown
  costSource: CostSource
  pricingMisses: PricingMiss[]
  dailyCosts: { date: string; cost: number }[]
  dailyTokenUsage: { date: string; tokenUsage: TokenUsageBreakdown }[]
  byModel: UsageModelBreakdown[]
  byProject: UsageProjectBreakdown[]
  rateLimits: {
    window: string
    remaining: number
    total: number
    resetsIn: string
  }[]
}
