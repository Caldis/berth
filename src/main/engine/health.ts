import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { AssetScope } from '@shared/types/asset'
import type { HealthCheck, HealthCheckCategory, HealthCheckSeverity } from '@shared/types/ipc'

export interface HealthCheckOptions {
  homeDir?: string
  projectDir?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
}

interface HealthCheckInput {
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
}

const AGENT_NAMES: Record<HealthCheck['agentId'], string> = {
  all: 'All agents',
  'claude-code': 'Claude Code',
  codex: 'Codex'
}

export function runHealthChecks(options: HealthCheckOptions | string = {}): HealthCheck[] {
  const normalized = normalizeOptions(options)
  const homeDir = normalized.homeDir
  const checks: HealthCheck[] = []
  const claudeDir = path.join(homeDir, '.claude')
  const codexDir = normalized.env.CODEX_HOME || path.join(homeDir, '.codex')
  const hasClaude = fs.existsSync(claudeDir)
  const hasCodex = fs.existsSync(codexDir)

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

  if (!hasClaude) return checks

  // Check for CLAUDE.md
  if (!fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))) {
    checks.push(makeCheck({
      id: 'claude-code:source:user-claude-md-missing',
      severity: 'info',
      category: 'source',
      agentId: 'claude-code',
      title: 'User CLAUDE.md not found',
      message: 'No user-level CLAUDE.md found.',
      suggestion: 'Create ~/.claude/CLAUDE.md if you want shared Claude Code instructions.',
      scope: 'user',
      path: path.join(claudeDir, 'CLAUDE.md')
    }))
  }

  // Check settings.json readability
  const settingsPath = path.join(claudeDir, 'settings.json')
  if (fs.existsSync(settingsPath)) {
    try {
      JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      checks.push(makeCheck({
        id: 'claude-code:syntax:user-settings-invalid',
        severity: 'error',
        category: 'syntax',
        agentId: 'claude-code',
        title: 'Invalid settings.json',
        message: 'settings.json contains invalid JSON.',
        suggestion: 'Fix the JSON syntax in ~/.claude/settings.json.',
        scope: 'user',
        path: settingsPath,
        assetType: 'hook'
      }))
    }
  }

  // Check for orphaned sessions dir
  const projectsDir = path.join(claudeDir, 'projects')
  if (fs.existsSync(projectsDir)) {
    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true })
      const emptyDirs = entries.filter((e) => {
        if (!e.isDirectory()) return false
        try {
          return fs.readdirSync(path.join(projectsDir, e.name)).length === 0
        } catch {
          return false
        }
      })
      if (emptyDirs.length > 0) {
        checks.push(makeCheck({
          id: 'claude-code:session:empty-project-dirs',
          severity: 'info',
          category: 'session',
          agentId: 'claude-code',
          title: 'Empty Claude project directories',
          message: `${emptyDirs.length} empty project directories found in ~/.claude/projects/.`,
          suggestion: 'This is usually harmless. Remove stale directories if they are no longer useful.',
          scope: 'session',
          path: projectsDir
        }))
      }
    } catch {
      // ignore
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

function makeCheck(input: HealthCheckInput): HealthCheck {
  return {
    ...input,
    agentName: AGENT_NAMES[input.agentId]
  }
}
