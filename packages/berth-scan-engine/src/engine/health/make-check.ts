// HealthCheck construction + metadata derivation (evidence / target / confidence)
// and result de-duplication.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import type {
  HealthCheck,
  HealthCheckConfidence,
  HealthCheckEvidence,
  HealthCheckTarget
} from '@shared/types/ipc'
import type { HealthCheckInput } from './types'
import { AGENT_NAMES, EVIDENCE } from './constants'

export function makeCheck(input: HealthCheckInput): HealthCheck {
  const suggestion = input.suggestion
  return {
    ...input,
    agentName: AGENT_NAMES[input.agentId],
    evidence: input.evidence ?? evidenceFor(input),
    fix: input.fix ?? (suggestion ? { label: 'Suggested fix', description: suggestion } : undefined),
    target: input.target ?? targetFor(input),
    confidence: input.confidence ?? confidenceFor(input)
  }
}

function evidenceFor(input: HealthCheckInput): HealthCheckEvidence[] {
  if (input.agentId === 'codex') {
    if (input.assetType === 'hook') return [EVIDENCE.codexHooks]
    if (input.assetType === 'skill') return [EVIDENCE.codexSkills]
    if (input.assetType === 'agent') return [EVIDENCE.codexSubagents]
    if (input.assetType === 'agents-md') return [EVIDENCE.codexAgentsMd]
    if (input.category === 'session') return [EVIDENCE.codexWindows]
    return [EVIDENCE.codexConfig]
  }

  if (input.agentId === 'claude-code') {
    if (input.assetType === 'hook') return [EVIDENCE.claudeHooks]
    if (input.assetType === 'mcp-server') return [EVIDENCE.claudeMcp]
    if (input.assetType === 'skill') return [EVIDENCE.claudeSkills]
    if (input.assetType === 'agent') return [EVIDENCE.claudeSubagents]
    if (input.assetType === 'claude-md' || input.assetType === 'agents-md') return [EVIDENCE.claudeMemory]
    if (input.category === 'session') return [EVIDENCE.claudeSessions]
    return [EVIDENCE.claudeSettings]
  }

  return []
}

function targetFor(input: HealthCheckInput): HealthCheckTarget | undefined {
  if (input.assetId && input.assetType === 'session') return { route: `/sessions/${input.assetId}`, assetId: input.assetId, path: input.path }

  const route = routeForAssetType(input.assetType)
  if (route || input.assetId || input.path) {
    return {
      route,
      assetId: input.assetId,
      path: input.path
    }
  }

  return undefined
}

function routeForAssetType(assetType: string | undefined): string | undefined {
  if (!assetType) return undefined
  if (assetType === 'hook') return '/configuration/capabilities?tab=hooks'
  if (assetType === 'mcp-server') return '/configuration/capabilities?tab=mcp'
  if (assetType === 'permission') return '/configuration/capabilities?tab=permissions'
  if (assetType === 'env') return '/configuration/capabilities?tab=env'
  if (assetType === 'plugin') return '/configuration/capabilities?tab=plugins'
  if (assetType === 'statusline') return '/configuration/capabilities?tab=statusLine'
  if (['skill', 'agent', 'claude-md', 'gemini-md', 'agents-md', 'command', 'output-mode'].includes(assetType)) {
    return '/configuration/instructions'
  }
  return undefined
}

function confidenceFor(input: HealthCheckInput): HealthCheckConfidence {
  if (input.category === 'syntax' || input.severity === 'error') return 'high'
  if (input.category === 'configuration') return 'medium'
  if (input.category === 'session' || input.severity === 'info') return 'low'
  return 'high'
}

export function dedupeChecks(checks: HealthCheck[]): HealthCheck[] {
  const seen = new Set<string>()
  const result: HealthCheck[] = []
  for (const check of checks) {
    if (seen.has(check.id)) continue
    seen.add(check.id)
    result.push(check)
  }
  return result
}
