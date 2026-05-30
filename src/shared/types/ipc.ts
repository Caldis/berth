import type { Asset, AssetCategory, AssetStats, SessionSummary, UsageSummary, Relation } from './asset'

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

export interface SessionListResult {
  sessions: SessionSummary[]
  totalCount: number
}

export interface SessionDetailResult {
  summary: SessionSummary
  skillsUsed: Asset[]
  mcpServers: Asset[]
  hooksFired: { event: string; count: number }[]
  plans: { id: string; title: string; path: string }[]
  todos: { id: string; title: string; done: boolean }[]
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
  severity: 'info' | 'warning' | 'error'
  message: string
  assetId?: string
  assetType?: string
}

export interface MCPMergeInfo {
  serverId: string
  name: string
  scopes: { scope: string; source: string; config: Record<string, unknown> }[]
  effective: Record<string, unknown>
  hasConflict: boolean
  overriddenBy?: string
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
  'assets:scan-category': { args: [AssetCategory]; result: Asset[] }
  'assets:get': { args: [string]; result: Asset | null }
  'assets:relations': { args: [string]; result: Relation[] }
  'assets:search': { args: [string]; result: SearchResult[] }
  'assets:health-check': { args: []; result: HealthCheck[] }
  'assets:import-chain': { args: [string]; result: ImportChainNode }
  'sessions:list': { args: [{ projectFilter?: string; limit?: number }]; result: SessionListResult }
  'sessions:get': { args: [string]; result: SessionDetailResult | null }
  'usage:summary': { args: [{ days: number }]; result: UsageSummary }
  'mcp:merged': { args: []; result: MCPMergeInfo[] }
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
