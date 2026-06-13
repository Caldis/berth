import type {
  AgentAdapter,
  Asset,
  AssetCategory,
  AssetScope,
  AssetType,
  DetectResult,
  ScanRoot,
  ScanSourceCode,
  ScanSourceKind,
  ScanSourceStatus
} from './shared/types/asset'
import type {
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginHealthCheckDescriptor,
  AgentCapabilityPluginHookSchemaDescriptor,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestPermission,
  AgentCapabilityPluginReference,
  AgentCapabilityPluginSourceDescriptor
} from './shared/types/agent-plugin'

export type {
  AgentAdapter,
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginHealthCheckDescriptor,
  AgentCapabilityPluginHookSchemaDescriptor,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestPermission,
  AgentCapabilityPluginReference,
  AgentCapabilityPluginSourceDescriptor,
  Asset,
  AssetCategory,
  AssetScope,
  AssetType,
  DetectResult,
  ScanRoot,
  ScanSourceCode,
  ScanSourceKind,
  ScanSourceStatus
}

export type AgentAdapterSourceStability = 'official-docs' | 'primary-source' | 'heuristic'

export type AgentAdapterSourceSensitivity =
  | 'normal'
  | 'sensitive-metadata-only'
  | 'credential-presence-only'
  | 'debug-summary-only'

export interface AgentAdapterSourcePolicy extends AgentCapabilityPluginSourceDescriptor {
  stability: AgentAdapterSourceStability
  evidenceUrls: string[]
  sensitivity: AgentAdapterSourceSensitivity
  maxBytes?: number
  maxRows?: number
  defaultHidden?: boolean
}

export interface AgentAdapterVersionProbe {
  command?: string
  args?: string[]
  packageName?: string
  source?: 'cli' | 'package-manager' | 'manifest' | 'unknown'
}

export interface AgentAdapterDefinition {
  id: string
  displayName: string
  version: string
  homepageUrl: string
  downloadUrl: string
  releaseChannel?: string
  agentCompatibility?: {
    agentId: string
    name: string
    versionRange?: string
  }
  sources: AgentAdapterSourcePolicy[]
  assets: AgentCapabilityPluginAssetDescriptor[]
  permissions: AgentCapabilityPluginManifestPermission[]
  hookSchema?: AgentCapabilityPluginHookSchemaDescriptor
  healthChecks?: AgentCapabilityPluginHealthCheckDescriptor[]
  references: AgentCapabilityPluginReference[]
  versionProbe?: AgentAdapterVersionProbe
}
