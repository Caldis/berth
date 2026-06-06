/**
 * Bridge to the existing berth scan engine (src/main/engine).
 *
 * P1.3 (hybrid): the CLI consumes the engine in-place via this thin bridge so
 * the agent CLI + E2E loop exist NOW. The engine is Electron-free and
 * native-free, so it bundles cleanly. P2 physically migrates the engine source
 * into this package, after which the relative import below becomes a local one.
 */
import { AssetScanner } from '../../../src/main/engine/scanner'
import type { Asset } from '../../../src/shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '../../../src/shared/types/ipc'
import type { ProjectScopeCandidate } from '../../../src/shared/scope'

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
