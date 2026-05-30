import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scanCapabilities, scanInstructions, scanState } from '../../src/main/adapters/claude-code/scanner'
import { parseHooks, parseStatuslinesFromSettings } from '../../src/main/adapters/claude-code/parsers'

let root: string | null = null

describe('Claude Code scanner', () => {
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true })
    root = null
  })

  it('treats only top-level project JSONL files as sessions', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-scanner-'))
    const claudeDir = join(root, '.claude')
    const projectDir = join(claudeDir, 'projects', 'D--Code-berth')
    const subagentDir = join(projectDir, 'parent-session', 'subagents')
    mkdirSync(subagentDir, { recursive: true })

    writeFileSync(
      join(projectDir, 'parent-session.jsonl'),
      `${JSON.stringify({ type: 'summary', title: 'Parent session', timestamp: '2026-05-30T00:00:00.000Z' })}\n`
    )
    writeFileSync(
      join(subagentDir, 'agent-a123.jsonl'),
      `${JSON.stringify({ type: 'summary', title: 'Subagent child', timestamp: '2026-05-30T00:00:01.000Z' })}\n`
    )

    const assets = scanState({ claudeDir, errors: [] })
    const sessions = assets.filter((asset) => asset.type === 'session')

    expect(sessions).toHaveLength(1)
    expect(sessions[0].name).toBe('Parent session')
  })

  it('flattens Claude hook entries by event type', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hooks-'))
    const settingsPath = join(root, 'settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'echo pre-tool' }]
            }
          ]
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'user')

    expect(hooks).toHaveLength(1)
    expect(hooks[0].name).toBe('echo pre-tool')
    expect(hooks[0].meta).toMatchObject({
      event: 'PreToolUse',
      eventType: 'PreToolUse',
      matcher: 'Bash',
      command: 'echo pre-tool',
      hookType: 'command'
    })
  })

  it('detects Claude hook entry files from project-root commands', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-entry-'))
    const projectDir = join(root, 'project')
    const settingsDir = join(projectDir, '.claude')
    const hooksDir = join(settingsDir, 'hooks')
    const hookPath = join(hooksDir, 'pre_tool.py')
    const settingsPath = join(settingsDir, 'settings.json')
    mkdirSync(hooksDir, { recursive: true })
    writeFileSync(hookPath, 'print("pre")\n')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'python "$(git rev-parse --show-toplevel)/.claude/hooks/pre_tool.py"'
                }
              ]
            }
          ]
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'project')

    expect(hooks[0].meta).toMatchObject({
      entryPaths: [hookPath]
    })
  })

  it('parses Claude statusLine and subagentStatusLine settings', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-statusline-'))
    const settingsPath = join(root, 'settings.json')
    const statuslineScript = join(root, 'statusline.ps1')
    writeFileSync(statuslineScript, 'Write-Output status\n')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        disableAllHooks: true,
        statusLine: {
          type: 'command',
          command: `pwsh "${statuslineScript}"`,
          padding: 2,
          refreshInterval: 5,
          hideVimModeIndicator: true
        },
        subagentStatusLine: {
          type: 'command',
          command: 'node subagent-statusline.js'
        }
      })
    )

    const assets = parseStatuslinesFromSettings(settingsPath, 'user')

    expect(assets).toHaveLength(2)
    expect(assets[0]).toMatchObject({
      agentId: 'claude-code',
      category: 'capability',
      type: 'statusline',
      scope: 'user',
      name: 'Status Line',
      path: settingsPath,
      meta: {
        provider: 'claude-code',
        settingKey: 'statusLine',
        statusLineKind: 'main',
        commandType: 'command',
        command: `pwsh "${statuslineScript}"`,
        padding: 2,
        refreshInterval: 5,
        hideVimModeIndicator: true,
        disabledByDisableAllHooks: true,
        entryPaths: [statuslineScript]
      }
    })
    expect(assets[1]).toMatchObject({
      name: 'Subagent Status Line',
      meta: {
        settingKey: 'subagentStatusLine',
        statusLineKind: 'subagent',
        command: 'node subagent-statusline.js',
        disabledByDisableAllHooks: true
      }
    })
  })

  it('scans Claude project local statusLine settings', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-local-statusline-'))
    const claudeDir = join(root, '.claude-home')
    const projectDir = join(root, 'project')
    const projectClaudeDir = join(projectDir, '.claude')
    mkdirSync(projectClaudeDir, { recursive: true })
    writeFileSync(
      join(projectClaudeDir, 'settings.local.json'),
      JSON.stringify({
        statusLine: {
          type: 'command',
          command: 'echo local'
        }
      })
    )

    const assets = scanCapabilities({ claudeDir, projectDir, errors: [] })

    expect(assets.filter((asset) => asset.type === 'statusline')).toEqual([
      expect.objectContaining({
        scope: 'project',
        path: join(projectClaudeDir, 'settings.local.json'),
        meta: expect.objectContaining({
          settingKey: 'statusLine',
          command: 'echo local'
        })
      })
    ])
  })

  it('scans Claude subagents from Markdown frontmatter files', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-agent-'))
    const claudeDir = join(root, '.claude')
    const agentsDir = join(claudeDir, 'agents')
    mkdirSync(agentsDir, { recursive: true })
    writeFileSync(
      join(agentsDir, 'reviewer.md'),
      [
        '---',
        'name: reviewer',
        'description: Reviews code changes.',
        'tools: Read, Grep',
        '---',
        'Review code like an owner.'
      ].join('\n')
    )

    const errors: { path: string; type: string; message: string }[] = []
    const assets = scanInstructions({ claudeDir, errors })

    expect(errors).toEqual([])
    expect(assets.filter((asset) => asset.type === 'agent')).toEqual([
      expect.objectContaining({
        agentId: 'claude-code',
        category: 'instruction',
        type: 'agent',
        scope: 'user',
        name: 'reviewer',
        meta: expect.objectContaining({
          description: 'Reviews code changes.',
          tools: 'Read, Grep'
        })
      })
    ])
  })
})
