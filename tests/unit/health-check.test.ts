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
    expect(checks).toEqual([
      expect.objectContaining({
        id: 'codex:session:user-sessions-empty',
        severity: 'info',
        agentId: 'codex',
        category: 'session'
      })
    ])
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

  it('reports Codex structure, reference, configuration and session checks', () => {
    const codexDir = path.join(tempDir!, '.codex')
    fs.mkdirSync(path.join(codexDir, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(codexDir, 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(tempDir!, '.agents', 'skills', 'broken-skill'), { recursive: true })
    fs.writeFileSync(path.join(codexDir, 'AGENTS.md'), '@missing.md\n')
    fs.writeFileSync(
      path.join(codexDir, 'config.toml'),
      [
        '[[hooks.PreToolUse]]',
        'matcher = "Bash"',
        '[[hooks.PreToolUse.hooks]]',
        'type = "command"',
        'command = "python hook.py"'
      ].join('\n')
    )
    fs.writeFileSync(
      path.join(codexDir, 'hooks.json'),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }] } })
    )
    fs.writeFileSync(path.join(codexDir, 'agents', 'broken.toml'), 'name = "broken"\n')

    const checks = runHealthChecks({ homeDir: tempDir!, platform: 'win32' })

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'codex:configuration:user-hooks-duplicated' }),
        expect.objectContaining({ id: 'codex:configuration:user-hook-windows-command' }),
        expect.objectContaining({ id: 'codex:structure:user-agent-broken' }),
        expect.objectContaining({ id: 'codex:structure:user-skill-broken-skill-missing-entrypoint' }),
        expect.objectContaining({ id: 'codex:session:user-sessions-empty' })
      ])
    )
    expect(checks.some((check) => check.id.startsWith('codex:reference:user-agents-md-missing-import'))).toBe(true)
  })

  it('reports invalid Codex TOML', () => {
    const codexDir = path.join(tempDir!, '.codex')
    fs.mkdirSync(codexDir, { recursive: true })
    fs.writeFileSync(path.join(codexDir, 'config.toml'), '[mcp_servers.bad\ncommand = "bad"')

    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks).toContainEqual(
      expect.objectContaining({
        id: 'codex:syntax:user-config-invalid',
        severity: 'error',
        category: 'syntax',
        path: path.join(codexDir, 'config.toml')
      })
    )
  })

  it('reports Claude Code project and user health checks', () => {
    const projectDir = path.join(tempDir!, 'project')
    const claudeDir = path.join(tempDir!, '.claude')
    fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(claudeDir, 'skills', 'broken-skill'), { recursive: true })
    fs.mkdirSync(path.join(claudeDir, 'projects', 'empty-project'), { recursive: true })
    fs.mkdirSync(projectDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), '@missing.md\n')
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(*)'] },
        hooks: {
          PreToolUse: [{ hooks: [{ type: 'command', command: 'echo check' }] }]
        }
      })
    )
    fs.writeFileSync(
      path.join(claudeDir, 'agents', 'broken.md'),
      ['---', 'name: broken', '---', 'Missing description.'].join('\n')
    )
    fs.writeFileSync(path.join(projectDir, '.mcp.json'), JSON.stringify({ mcpServers: { empty: {} } }))

    const checks = runHealthChecks({ homeDir: tempDir!, projectDir, platform: 'win32' })

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'claude-code:configuration:user-permission-broad-bash' }),
        expect.objectContaining({ id: 'claude-code:configuration:user-hook-windows-shell' }),
        expect.objectContaining({ id: 'claude-code:structure:user-agent-broken' }),
        expect.objectContaining({ id: 'claude-code:structure:user-skill-broken-skill-missing-entrypoint' }),
        expect.objectContaining({ id: 'claude-code:structure:project-mcp-empty-missing-transport' }),
        expect.objectContaining({ id: 'claude-code:session:empty-project-dirs' })
      ])
    )
    expect(checks.some((check) => check.id.startsWith('claude-code:reference:user-claude-md-missing-import'))).toBe(true)
  })
})
