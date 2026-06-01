import type {
  AssetCategory,
  AssetScope,
  ScanSourceCode,
  ScanSourceKind,
  ScanSourceStatus
} from './asset'

export type AgentCapabilityPluginId = 'claude-code' | 'codex'

export type AgentPluginAgentId = 'claude-code' | 'codex'

export type AgentCapabilityPluginPermissionKind = 'read' | 'write' | 'execute'

export type AgentCapabilityPluginCapabilityStatus = 'available' | 'partial' | 'planned'

export type AgentCapabilityPluginCapabilityId =
  | 'sourceDiscovery'
  | 'assetParsing'
  | 'hookSchema'
  | 'hookActions'
  | 'healthChecks'
  | 'sessionUsageParsing'
  | 'uiGuidance'

export interface AgentCapabilityPluginCapability {
  id: AgentCapabilityPluginCapabilityId
  status: AgentCapabilityPluginCapabilityStatus
  labelKey: string
  descriptionKey: string
  statusDetailKey?: string
}

export interface AgentCapabilityPluginPermission {
  kind: AgentCapabilityPluginPermissionKind
  scopes: AssetScope[]
  pathPatterns: string[]
  reasonKey: string
  sensitive?: boolean
}

export interface AgentCapabilityPluginSourceDescriptor {
  code: ScanSourceCode
  scope: AssetScope
  kind: ScanSourceKind
  categories: AssetCategory[]
  pathPattern: string
  labelKey: string
  descriptionKey: string
}

export interface AgentCapabilityPluginSource {
  path: string
  scope: AssetScope
  status: ScanSourceStatus
  code?: ScanSourceCode
  kind?: ScanSourceKind
  categories?: AssetCategory[]
  declared?: boolean
  labelKey?: string
  descriptionKey?: string
  pathPattern?: string
}

export interface AgentCapabilityPluginSourceCoverage {
  total: number
  counts: Record<ScanSourceStatus, number>
  sources: AgentCapabilityPluginSource[]
}

export interface AgentCapabilityPluginReference {
  label: string
  url: string
}

export interface AgentCapabilityPlugin {
  id: AgentCapabilityPluginId
  displayName: string
  version: string
  schemaVersion: number
  builtin: boolean
  enabled: boolean
  detected: boolean
  agentCompatibility: {
    agentId: AgentPluginAgentId
    name: string
    versionRange?: string
  }
  capabilities: AgentCapabilityPluginCapability[]
  permissions: AgentCapabilityPluginPermission[]
  sourceDescriptors: AgentCapabilityPluginSourceDescriptor[]
  sourceCoverage: AgentCapabilityPluginSourceCoverage
  references: AgentCapabilityPluginReference[]
}

export interface AgentCapabilityPluginListResult {
  plugins: AgentCapabilityPlugin[]
}
