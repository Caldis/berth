// Internal health check shapes shared across providers.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import type { Asset, AssetScope } from '@shared/types/asset'
import type {
  HealthCheck,
  HealthCheckCategory,
  HealthCheckConfidence,
  HealthCheckEvidence,
  HealthCheckFix,
  HealthCheckSeverity,
  HealthCheckTarget,
  ScanError
} from '@shared/types/ipc'

export interface HealthCheckOptions {
  homeDir?: string
  projectDir?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  assets?: Asset[]
  scanErrors?: ScanError[]
}

export type NormalizedHealthCheckOptions =
  Required<Pick<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>> &
  Omit<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>

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
