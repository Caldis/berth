// Internal health check shapes shared across providers.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import type { AssetScope } from '@shared/types/asset'
import type {
  HealthCheck,
  HealthCheckCategory,
  HealthCheckConfidence,
  HealthCheckEvidence,
  HealthCheckFix,
  HealthCheckSeverity,
  HealthCheckTarget
} from '@shared/types/ipc'

export interface HealthCheckInput {
  id: string
  severity: HealthCheckSeverity
  category: HealthCheckCategory
  agentId: HealthCheck['agentId']
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

export interface HealthPaths {
  homeDir: string
  claudeDir: string
  claudeDirs: string[]
  codexDir: string
  codexDirs: string[]
  projectDir?: string
}
