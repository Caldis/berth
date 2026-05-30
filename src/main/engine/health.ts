import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { HealthCheck } from '@shared/types/ipc'

export function runHealthChecks(homeDir = os.homedir()): HealthCheck[] {
  const checks: HealthCheck[] = []
  const claudeDir = path.join(homeDir, '.claude')
  const codexDir = path.join(homeDir, '.codex')
  const hasClaude = fs.existsSync(claudeDir)
  const hasCodex = fs.existsSync(codexDir)

  if (!hasClaude && !hasCodex) {
    checks.push({
      id: 'no-agent-data',
      severity: 'warning',
      message: 'No supported agent data found. Berth scans Claude Code and Codex local data when present.'
    })
    return checks
  }

  if (!hasClaude) return checks

  // Check for CLAUDE.md
  if (!fs.existsSync(path.join(claudeDir, 'CLAUDE.md'))) {
    checks.push({
      id: 'no-user-claude-md',
      severity: 'info',
      message: 'No user-level CLAUDE.md found. Consider creating ~/.claude/CLAUDE.md.'
    })
  }

  // Check settings.json readability
  const settingsPath = path.join(claudeDir, 'settings.json')
  if (fs.existsSync(settingsPath)) {
    try {
      JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      checks.push({
        id: 'invalid-settings',
        severity: 'error',
        message: 'settings.json contains invalid JSON.',
        assetType: 'hook'
      })
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
        checks.push({
          id: 'empty-project-dirs',
          severity: 'info',
          message: `${emptyDirs.length} empty project directories found in ~/.claude/projects/`
        })
      }
    } catch {
      // ignore
    }
  }

  return checks
}
