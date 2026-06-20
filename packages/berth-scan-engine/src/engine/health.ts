// Health check entry point. Orchestrates the per-agent providers and
// cross-agent / source-derived checks. The detailed check logic lives in the
// cohesive modules under ./health/ (GH #6 health-restructure split).
import type { HealthCheck } from '@shared/types/ipc'
import type { HealthCheckOptions } from './health/types'
import { checkClaude } from './health/claude'
import { checkCodex } from './health/codex'
import {
  checkProjectInstructionCompatibility,
  checksFromScanErrors,
  checksFromSessionAssets
} from './health/cross-agent'
import { dedupeChecks, makeCheck } from './health/make-check'
import { buildHealthPaths, hasClaudeData, hasCodexData, normalizeOptions } from './health/paths'

export type { HealthCheckOptions }

export function runHealthChecks(options: HealthCheckOptions | string = {}): HealthCheck[] {
  const normalized = normalizeOptions(options)
  const paths = buildHealthPaths(normalized)
  const checks: HealthCheck[] = []
  const hasClaude = hasClaudeData(paths)
  const hasCodex = hasCodexData(paths)

  if (!hasClaude && !hasCodex) {
    checks.push(makeCheck({
      id: 'all:source:no-agent-data',
      severity: 'warning',
      category: 'source',
      agentId: 'all',
      title: 'No supported agent data found',
      message: 'Berth scans Claude Code and Codex local data when present.',
      suggestion: 'Install or run Claude Code or Codex once, then refresh Berth.',
      i18nKeys: {
        title: 'healthChecks.text.titles.noAgentData',
        message: 'healthChecks.text.messages.noAgentData',
        suggestion: 'healthChecks.text.suggestions.noAgentData'
      }
    }))
    return checks
  }

  if (hasClaude) checks.push(...checkClaude(paths, normalized.platform))
  if (hasCodex) checks.push(...checkCodex(paths, normalized.platform))
  if (paths.projectDir) checkProjectInstructionCompatibility(checks, paths.projectDir)
  checks.push(...checksFromScanErrors(normalized.scanErrors ?? []))
  checks.push(...checksFromSessionAssets(normalized.assets ?? []))

  return dedupeChecks(checks)
}
