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

export type AssetType =
  | 'claude-md'
  | 'agents-md'
  | 'skill'
  | 'agent'
  | 'command'
  | 'output-mode'
  | 'team'
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
  description: string
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
  teams: number
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

export interface UsageSummary {
  totalCost: number
  totalTokens: number
  tokenUsage: TokenUsageBreakdown
  costSource: CostSource
  dailyCosts: { date: string; cost: number }[]
  dailyTokenUsage: { date: string; tokenUsage: TokenUsageBreakdown }[]
  byModel: { model: string; percentage: number; cost: number; tokens: number; tokenUsage: TokenUsageBreakdown }[]
  byProject: { project: string; percentage: number; cost: number; tokens: number; tokenUsage: TokenUsageBreakdown }[]
  rateLimits: {
    window: string
    remaining: number
    total: number
    resetsIn: string
  }[]
}
