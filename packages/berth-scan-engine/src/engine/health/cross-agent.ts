// Cross-agent and source-derived health checks: project instruction
// compatibility, scanner parser errors, and session asset metadata.
// Extracted from health.ts (GH #6 health-restructure, behavior-preserving).
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { HealthCheck, ScanError } from '@shared/types/ipc'
import { hashString, stringValue } from './value-guards'
import { fileExists } from './fs-utils'
import { EVIDENCE } from './constants'
import { makeCheck } from './make-check'

export function checkProjectInstructionCompatibility(checks: HealthCheck[], projectDir: string): void {
  const agentsMd = path.join(projectDir, 'AGENTS.md')
  const claudeMdCandidates = [
    path.join(projectDir, 'CLAUDE.md'),
    path.join(projectDir, '.claude', 'CLAUDE.md')
  ]
  const claudeMd = claudeMdCandidates.find(fileExists)
  const hasAgentsMd = fileExists(agentsMd)

  if (claudeMd && !hasAgentsMd) {
    checks.push(makeCheck({
      id: 'all:reference:project-claude-md-without-agents-md',
      severity: 'info',
      category: 'reference',
      agentId: 'all',
      title: 'Project instructions are Claude Code-only',
      message: 'Claude Code reads CLAUDE.md, but Codex reads AGENTS.md. No project AGENTS.md was found.',
      suggestion: 'Create AGENTS.md when shared project instructions should also apply to Codex.',
      scope: 'project',
      path: claudeMd,
      assetType: 'claude-md',
      evidence: [EVIDENCE.claudeMemory, EVIDENCE.codexAgentsMd],
      fix: {
        label: 'Add Codex project instructions',
        description: 'Create AGENTS.md and keep only instructions that should apply to Codex.',
        snippet: '# Shared project instructions'
      },
      confidence: 'high',
      i18nKeys: {
        title: 'healthChecks.text.titles.projectClaudeOnly',
        message: 'healthChecks.text.messages.projectClaudeOnly',
        suggestion: 'healthChecks.text.suggestions.projectClaudeOnly',
        fixLabel: 'healthChecks.text.fixLabels.addCodexProjectInstructions',
        fixDescription: 'healthChecks.text.fixDescriptions.addCodexProjectInstructions'
      }
    }))
  }

  if (hasAgentsMd && !claudeMd) {
    checks.push(makeCheck({
      id: 'all:reference:project-agents-md-without-claude-md',
      severity: 'info',
      category: 'reference',
      agentId: 'all',
      title: 'Project instructions are Codex-only',
      message: 'Codex reads AGENTS.md, but Claude Code reads CLAUDE.md. No project CLAUDE.md was found.',
      suggestion: 'Create CLAUDE.md with @AGENTS.md when shared project instructions should also apply to Claude Code.',
      scope: 'project',
      path: agentsMd,
      assetType: 'agents-md',
      evidence: [EVIDENCE.codexAgentsMd, EVIDENCE.claudeMemory],
      fix: {
        label: 'Import shared instructions for Claude Code',
        description: 'Create CLAUDE.md and import the shared AGENTS.md file.',
        snippet: '@AGENTS.md'
      },
      confidence: 'high',
      i18nKeys: {
        title: 'healthChecks.text.titles.projectCodexOnly',
        message: 'healthChecks.text.messages.projectCodexOnly',
        suggestion: 'healthChecks.text.suggestions.projectCodexOnly',
        fixLabel: 'healthChecks.text.fixLabels.importSharedForClaude',
        fixDescription: 'healthChecks.text.fixDescriptions.importSharedForClaude'
      }
    }))
  }
}

export function checksFromScanErrors(errors: ScanError[]): HealthCheck[] {
  return errors.map((error) => {
    const agentId = inferAgentId(error.path)
    return makeCheck({
      id: `${agentId}:syntax:scan-error-${hashString(`${error.path}:${error.type}:${error.message}`)}`,
      severity: 'error',
      category: 'syntax',
      agentId,
      title: 'Scanner parser error',
      message: error.message,
      suggestion: 'Fix the file syntax, then refresh Berth.',
      path: error.path,
      assetType: error.type,
      i18nKeys: {
        title: 'healthChecks.text.titles.scannerParserError',
        // Raw scanner errors have no stable key; only title/suggestion do.
        suggestion: 'healthChecks.text.suggestions.scannerParserError'
      }
    })
  })
}

export function checksFromSessionAssets(assets: Asset[]): HealthCheck[] {
  const checks: HealthCheck[] = []
  for (const asset of assets) {
    if (asset.type !== 'session') continue
    const startedAt = stringValue(asset.meta.startedAt)
    const projectPath = stringValue(asset.meta.projectPath)
    if (!startedAt || !projectPath) {
      const agentId = asset.agentId === 'codex' ? 'codex' : 'claude-code'
      checks.push(makeCheck({
        id: `${agentId}:session:metadata-missing-${hashString(asset.path)}`,
        severity: 'info',
        category: 'session',
        agentId,
        title: 'Session metadata is incomplete',
        message: `${asset.name} is missing start time or project path metadata.`,
        suggestion: 'This can happen with partial or legacy transcripts.',
        scope: 'session',
        path: asset.path,
        assetId: asset.id,
        assetType: 'session',
        i18nKeys: {
          title: 'healthChecks.text.titles.sessionMetadataIncomplete',
          message: 'healthChecks.text.messages.sessionMetadataIncomplete',
          suggestion: 'healthChecks.text.suggestions.sessionMetadataIncomplete'
        },
        params: { name: asset.name }
      }))
    }
  }
  return checks
}

function inferAgentId(filePath: string): HealthCheck['agentId'] {
  if (filePath.includes(`${path.sep}.codex${path.sep}`) || filePath.includes(`${path.sep}.agents${path.sep}`)) return 'codex'
  if (filePath.includes(`${path.sep}.claude${path.sep}`)) return 'claude-code'
  return 'all'
}
