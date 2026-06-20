import * as os from 'os'
import * as path from 'path'
import { resolveClaudeDirs, resolveCodexHomeDirs } from '../agent-homes'
import { hashString, stringValue } from './health/value-guards'
import { dirExists, fileExists } from './health/fs-utils'
import { checkClaude } from './health/claude'
import { checkCodex } from './health/codex'
import type { HealthPaths } from './health/types'
import { EVIDENCE } from './health/constants'
import { dedupeChecks, makeCheck } from './health/make-check'
import type { Asset } from '@shared/types/asset'
import type {
  HealthCheck,
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
      suggestion: 'Install or run Claude Code or Codex once, then refresh Berth.'
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

function checkProjectInstructionCompatibility(checks: HealthCheck[], projectDir: string): void {
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
      confidence: 'high'
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
      confidence: 'high'
    }))
  }
}

function checksFromScanErrors(errors: ScanError[]): HealthCheck[] {
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
      assetType: error.type
    })
  })
}

function checksFromSessionAssets(assets: Asset[]): HealthCheck[] {
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
        assetType: 'session'
      }))
    }
  }
  return checks
}


type NormalizedHealthCheckOptions =
  Required<Pick<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>> &
  Omit<HealthCheckOptions, 'homeDir' | 'platform' | 'env'>

function normalizeOptions(options: HealthCheckOptions | string): NormalizedHealthCheckOptions {
  if (typeof options === 'string') {
    return {
      homeDir: options,
      platform: process.platform,
      env: process.env
    }
  }
  return {
    ...options,
    homeDir: options.homeDir ?? os.homedir(),
    platform: options.platform ?? process.platform,
    env: options.env ?? process.env
  }
}

function buildHealthPaths(options: NormalizedHealthCheckOptions): HealthPaths {
  const claudeDirs = resolveClaudeDirs(options.homeDir, options.env)
  const codexDirs = resolveCodexHomeDirs(options.homeDir, options.env)
  return {
    homeDir: options.homeDir,
    claudeDir: claudeDirs[0],
    claudeDirs,
    codexDir: codexDirs[0],
    codexDirs,
    projectDir: options.projectDir
  }
}

function hasClaudeData(paths: HealthPaths): boolean {
  return (
    paths.claudeDirs.some(dirExists) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.claude')) ||
        fileExists(path.join(paths.projectDir, 'CLAUDE.md')) ||
        fileExists(path.join(paths.projectDir, '.mcp.json'))))
  )
}

function hasCodexData(paths: HealthPaths): boolean {
  return (
    paths.codexDirs.some((codexDir) => dirExists(codexDir) || dirExists(path.join(codexDir, 'skills'))) ||
    dirExists(path.join(paths.homeDir, '.agents', 'skills')) ||
    (paths.projectDir != null &&
      (dirExists(path.join(paths.projectDir, '.codex')) ||
        fileExists(path.join(paths.projectDir, 'AGENTS.md')) ||
        dirExists(path.join(paths.projectDir, '.agents', 'skills'))))
  )
}


function inferAgentId(filePath: string): HealthCheck['agentId'] {
  if (filePath.includes(`${path.sep}.codex${path.sep}`) || filePath.includes(`${path.sep}.agents${path.sep}`)) return 'codex'
  if (filePath.includes(`${path.sep}.claude${path.sep}`)) return 'claude-code'
  return 'all'
}
