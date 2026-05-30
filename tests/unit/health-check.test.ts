import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runHealthChecks } from '../../src/main/engine/health'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-health-'))
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('runHealthChecks', () => {
  it('reports no supported agent data only when both Claude and Codex are missing', () => {
    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks).toEqual([
      {
        id: 'all:source:no-agent-data',
        severity: 'warning',
        category: 'source',
        agentId: 'all',
        agentName: 'All agents',
        title: 'No supported agent data found',
        message: 'Berth scans Claude Code and Codex local data when present.',
        suggestion: 'Install or run Claude Code or Codex once, then refresh Berth.'
      }
    ])
  })

  it('does not report a global Claude error in a Codex-only environment', () => {
    fs.mkdirSync(path.join(tempDir!, '.codex', 'sessions'), { recursive: true })

    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks.map((check) => check.id)).not.toContain('claude-code:source:no-claude-dir')
    expect(checks).toEqual([])
  })

  it('keeps Claude-specific checks when Claude data exists', () => {
    const claudeDir = path.join(tempDir!, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{ invalid json')

    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks.map((check) => check.id)).toEqual([
      'claude-code:source:user-claude-md-missing',
      'claude-code:syntax:user-settings-invalid'
    ])
    expect(checks[0]).toMatchObject({
      severity: 'info',
      category: 'source',
      agentId: 'claude-code',
      agentName: 'Claude Code',
      title: 'User CLAUDE.md not found',
      path: path.join(claudeDir, 'CLAUDE.md')
    })
    expect(checks[1]).toMatchObject({
      severity: 'error',
      category: 'syntax',
      agentId: 'claude-code',
      agentName: 'Claude Code',
      title: 'Invalid settings.json',
      path: path.join(claudeDir, 'settings.json'),
      assetType: 'hook'
    })
  })
})
