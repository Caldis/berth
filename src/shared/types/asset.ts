export type AssetCategory =
  | 'instruction'
  | 'capability'
  | 'state'
  | 'observability'
  | 'integration'

export type AssetScope = 'user' | 'project' | 'enterprise' | 'session'

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
  title: string
  project: string
  startedAt: string
  duration: number
  cost: number
  tokens: number
  model: string
  skillsUsed: string[]
  mcpServers: string[]
  hooksFired: number
}

export interface UsageSummary {
  totalCost: number
  totalTokens: number
  dailyCosts: { date: string; cost: number }[]
  byModel: { model: string; percentage: number; cost: number }[]
  byProject: { project: string; percentage: number; cost: number }[]
  rateLimits: {
    window: string
    remaining: number
    total: number
    resetsIn: string
  }[]
}
