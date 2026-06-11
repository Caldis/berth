/**
 * Bridge to the berth scan engine, now physically in-package (GH-121): the
 * engine is Electron-free and native-free, so it bundles cleanly into the CLI.
 */
import { AssetScanner } from './engine/scanner'
import type { Asset } from '@shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '@shared/types/ipc'
import type { ProjectScopeCandidate } from '@shared/scope'

export interface ScanInput {
  /** Override the user home (its `.claude` / `.codex` are scanned). */
  homeDir?: string
  /** Override the Codex home explicitly (maps to CODEX_HOME). */
  codexHome?: string
  /** Project root for project-scoped assets. */
  projectDir?: string
  /** Extra `.claude` dirs (maps to BERTH_EXTRA_CLAUDE_DIRS). */
  extraClaudeDirs?: string
  /** Extra Codex homes (maps to BERTH_EXTRA_CODEX_HOMES). */
  extraCodexHomes?: string
  /** Base environment (defaults to process.env). */
  env?: NodeJS.ProcessEnv
}

export interface EngineSnapshot {
  projectDir?: string
  assets: Asset[]
  stats: ScanResult['stats']
  errors: ScanResult['errors']
  sources: AgentScanSourceGroup[]
  projectCandidates: ProjectScopeCandidate[]
}

/** Run a one-shot read-only scan and return a snapshot-shaped result. */
export async function runScan(input: ScanInput = {}): Promise<EngineSnapshot> {
  const env: NodeJS.ProcessEnv = { ...(input.env ?? process.env) }
  if (input.codexHome) env.CODEX_HOME = input.codexHome
  if (input.extraClaudeDirs) env.BERTH_EXTRA_CLAUDE_DIRS = input.extraClaudeDirs
  if (input.extraCodexHomes) env.BERTH_EXTRA_CODEX_HOMES = input.extraCodexHomes

  const scanner = new AssetScanner(input.projectDir, {
    adapterRegistry: { homeDir: input.homeDir, env }
  })
  const scanResult = await scanner.scanAll()
  const sources = await scanner.getScanSourceGroups()
  return {
    projectDir: scanner.getProjectDir(),
    assets: scanResult.assets,
    stats: scanResult.stats,
    errors: scanResult.errors,
    sources,
    projectCandidates: scanner.getProjectScopeCandidates()
  }
}
