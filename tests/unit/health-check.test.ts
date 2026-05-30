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
    const checks = runHealthChecks(tempDir!)

    expect(checks).toEqual([
      {
        id: 'no-agent-data',
        severity: 'warning',
        message: 'No supported agent data found. Berth scans Claude Code and Codex local data when present.'
      }
    ])
  })

  it('does not report a global Claude error in a Codex-only environment', () => {
    fs.mkdirSync(path.join(tempDir!, '.codex', 'sessions'), { recursive: true })

    const checks = runHealthChecks(tempDir!)

    expect(checks.map((check) => check.id)).not.toContain('no-claude-dir')
    expect(checks).toEqual([])
  })

  it('keeps Claude-specific checks when Claude data exists', () => {
    const claudeDir = path.join(tempDir!, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{ invalid json')

    const checks = runHealthChecks(tempDir!)

    expect(checks.map((check) => check.id)).toEqual([
      'no-user-claude-md',
      'invalid-settings'
    ])
  })
})
