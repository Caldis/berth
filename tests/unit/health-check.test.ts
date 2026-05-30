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
      expect.objectContaining({
        id: 'all:source:no-agent-data',
        severity: 'warning',
        category: 'source',
        agentId: 'all',
        agentName: 'All agents',
        title: 'No supported agent data found',
        message: 'Berth scans Claude Code and Codex local data when present.',
        suggestion: 'Install or run Claude Code or Codex once, then refresh Berth.',
        fix: {
          label: 'Suggested fix',
          description: 'Install or run Claude Code or Codex once, then refresh Berth.'
        },
        confidence: 'high'
      })
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
        'command = "powershell -File hook.ps1"'
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
    expect(checks.find((check) => check.id === 'codex:configuration:user-hook-windows-command')).toMatchObject({
      evidence: [expect.objectContaining({ url: 'https://developers.openai.com/codex/hooks' })],
      target: expect.objectContaining({ route: '/configuration/capabilities?tab=hooks' }),
      fix: expect.objectContaining({ label: 'Suggested fix' }),
      confidence: 'medium'
    })
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
          PreToolUse: [{ hooks: [{ type: 'command', command: 'Get-ChildItem' }] }]
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

  it('does not warn for portable Claude and Codex hook commands on Windows', () => {
    const claudeDir = path.join(tempDir!, '.claude')
    const codexDir = path.join(tempDir!, '.codex')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.mkdirSync(codexDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), '# Claude\n')
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'echo check' }] }] } })
    )
    fs.writeFileSync(
      path.join(codexDir, 'config.toml'),
      [
        '[[hooks.PreToolUse]]',
        '[[hooks.PreToolUse.hooks]]',
        'type = "command"',
        'command = "python hook.py"'
      ].join('\n')
    )

    const checks = runHealthChecks({ homeDir: tempDir!, platform: 'win32' })

    expect(checks.map((check) => check.id)).not.toContain('claude-code:configuration:user-hook-windows-shell')
    expect(checks.map((check) => check.id)).not.toContain('codex:configuration:user-hook-windows-command')
  })

  it('reports official Codex ignored project config keys and skipped hook types', () => {
    const projectDir = path.join(tempDir!, 'project')
    const codexDir = path.join(projectDir, '.codex')
    fs.mkdirSync(codexDir, { recursive: true })
    fs.writeFileSync(
      path.join(codexDir, 'config.toml'),
      [
        'model_provider = "custom"',
        '[[hooks.Stop]]',
        '[[hooks.Stop.hooks]]',
        'type = "prompt"',
        'prompt = "Summarize"'
      ].join('\n')
    )

    const checks = runHealthChecks({ homeDir: tempDir!, projectDir })

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'codex:configuration:project-config-ignored-local-keys',
          evidence: [expect.objectContaining({ url: 'https://developers.openai.com/codex/config-reference' })]
        }),
        expect.objectContaining({
          id: 'codex:configuration:project-hook-stop-skipped-type-prompt',
          severity: 'info',
          evidence: [expect.objectContaining({ url: 'https://developers.openai.com/codex/hooks' })]
        })
      ])
    )
  })

  it('does not treat optional Claude skill frontmatter fields as required', () => {
    const claudeDir = path.join(tempDir!, '.claude')
    const skillDir = path.join(claudeDir, 'skills', 'minimal')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), '# Claude\n')
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'No frontmatter here.')

    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks.map((check) => check.id)).not.toContain('claude-code:structure:user-skill-minimal-frontmatter-missing-required')
    expect(checks.filter((check) => check.assetType === 'skill')).toEqual([])
  })

  it('suggests official schema pointers for Codex and Claude config files', () => {
    const claudeDir = path.join(tempDir!, '.claude')
    const codexDir = path.join(tempDir!, '.codex')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.mkdirSync(codexDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), '# Claude\n')
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ env: {} }))
    fs.writeFileSync(path.join(codexDir, 'config.toml'), 'model = "gpt-5.3-codex"\n')

    const checks = runHealthChecks({ homeDir: tempDir! })

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'claude-code:configuration:user-settings-schema-missing',
          severity: 'info',
          evidence: [expect.objectContaining({ url: 'https://code.claude.com/docs/en/settings' })],
          fix: expect.objectContaining({
            snippet: '{\n  "$schema": "https://json.schemastore.org/claude-code-settings.json"\n}'
          })
        }),
        expect.objectContaining({
          id: 'codex:configuration:user-config-schema-comment-missing',
          severity: 'info',
          evidence: [expect.objectContaining({ url: 'https://developers.openai.com/codex/config-reference' })],
          fix: expect.objectContaining({
            snippet: '#:schema https://developers.openai.com/codex/config-schema.json'
          })
        })
      ])
    )
  })

  it('suggests importing AGENTS.md from CLAUDE.md for Claude Code projects', () => {
    const projectDir = path.join(tempDir!, 'project')
    const claudeDir = path.join(tempDir!, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.mkdirSync(projectDir, { recursive: true })
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), '# User Claude\n')
    fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# Shared instructions\n')
    fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Claude project instructions\n')

    const checks = runHealthChecks({ homeDir: tempDir!, projectDir })

    expect(checks).toContainEqual(
      expect.objectContaining({
        id: 'claude-code:reference:project-agents-md-not-imported',
        severity: 'info',
        evidence: [expect.objectContaining({ url: 'https://code.claude.com/docs/en/memory' })],
        fix: expect.objectContaining({
          snippet: '@AGENTS.md'
        })
      })
    )
  })

  it('does not suggest official config hints when they are already present', () => {
    const projectDir = path.join(tempDir!, 'project')
    const claudeDir = path.join(tempDir!, '.claude')
    const codexDir = path.join(tempDir!, '.codex')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.mkdirSync(codexDir, { recursive: true })
    fs.mkdirSync(projectDir, { recursive: true })
    fs.writeFileSync(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify({ $schema: 'https://json.schemastore.org/claude-code-settings.json' })
    )
    fs.writeFileSync(
      path.join(codexDir, 'config.toml'),
      '#:schema https://developers.openai.com/codex/config-schema.json\nmodel = "gpt-5.3-codex"\n'
    )
    fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# Shared instructions\n')
    fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '@AGENTS.md\n')

    const checks = runHealthChecks({ homeDir: tempDir!, projectDir })
    const ids = checks.map((check) => check.id)

    expect(ids).not.toContain('claude-code:configuration:user-settings-schema-missing')
    expect(ids).not.toContain('codex:configuration:user-config-schema-comment-missing')
    expect(ids).not.toContain('claude-code:reference:project-agents-md-not-imported')
  })

  it('recognizes explicitly configured extra agent homes as supported data', () => {
    const extraClaudeDir = path.join(tempDir!, 'wsl-home', '.claude')
    const extraCodexDir = path.join(tempDir!, 'wsl-codex-home')
    fs.mkdirSync(extraClaudeDir, { recursive: true })
    fs.mkdirSync(extraCodexDir, { recursive: true })

    const checks = runHealthChecks({
      homeDir: tempDir!,
      env: {
        BERTH_EXTRA_CLAUDE_DIRS: extraClaudeDir,
        BERTH_EXTRA_CODEX_HOMES: extraCodexDir
      }
    })

    expect(checks.map((check) => check.id)).not.toContain('all:source:no-agent-data')
  })
})
