import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildHookHash, buildHookScenarioHash } from '@shared/hook-identity'
import { scanCapabilities, scanInstructions, scanState } from '@berth/scan-engine/adapters/claude-code/scanner'
import { parseHooks, parseStatuslinesFromSettings } from '@berth/scan-engine/adapters/claude-code/parsers'

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

  it('records a ScanError instead of silently dropping MCP servers when .claude.json is malformed (GH-115 T6)', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-scanner-'))
    const claudeDir = join(root, '.claude')
    mkdirSync(claudeDir, { recursive: true })
    // 坏 JSON: 此前 parseMcpServers 内层 catch 先行吞错, safeScan 永远收不到 throw,
    // 用户写坏一个配置文件 → MCP server 从所有页面无声消失且计数为 0。
    writeFileSync(join(root, '.claude.json'), '{ "mcpServers": { broken')

    const errors: { path: string; type: string; message: string }[] = []
    const assets = scanCapabilities({ claudeDir, errors })

    expect(assets.filter((a) => a.type === 'mcp-server')).toHaveLength(0)
    expect(errors.some((e) => e.path.endsWith('.claude.json'))).toBe(true)
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
      provider: 'claude-code',
      event: 'PreToolUse',
      eventType: 'PreToolUse',
      matcher: 'Bash',
      command: 'echo pre-tool',
      hookType: 'command',
      rawHook: { type: 'command', command: 'echo pre-tool' },
      enabled: true,
      effectiveEnabled: true,
      canToggleHook: true,
      toggleStrategy: 'soft-remove',
      stateSourcePath: settingsPath,
      source: settingsPath,
      occurrenceCount: 1,
      occurrences: [{ handlerIndex: 0, hookIndex: 0, mode: 'nested' }]
    })
    expect(hooks[0].meta.hookKey).toEqual(expect.stringMatching(/^claude-code:/))
    expect(hooks[0].meta.scenarioHash).toEqual(expect.any(String))
    expect(hooks[0].meta.hookHash).toEqual(expect.any(String))
  })

  it('marks hooks ineffective when settings.disableAllHooks is on', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hooks-disabled-all-'))
    const settingsPath = join(root, 'settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        disableAllHooks: true,
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
    // The hook is individually present (enabled) but the global switch overrides it.
    expect(hooks[0].meta).toMatchObject({
      enabled: true,
      effectiveEnabled: false,
      disabledByDisableAllHooks: true
    })
  })

  it('keeps hooks effective when settings.disableAllHooks is absent or false', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hooks-enabled-all-'))
    const settingsPath = join(root, 'settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        disableAllHooks: false,
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
    expect(hooks[0].meta.effectiveEnabled).toBe(true)
    expect(hooks[0].meta.disabledByDisableAllHooks).toBeUndefined()
  })

  it('keeps Claude non-command hook configuration metadata', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-http-'))
    const settingsPath = join(root, 'settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'http',
                  if: 'Bash(git *)',
                  url: 'http://localhost:8080/hooks/pre-tool-use',
                  timeout: 30,
                  statusMessage: 'Checking command',
                  headers: { Authorization: 'Bearer $TOKEN' },
                  allowedEnvVars: ['TOKEN']
                }
              ]
            }
          ]
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'user')

    expect(hooks).toHaveLength(1)
    expect(hooks[0].meta).toMatchObject({
      hookType: 'http',
      ifCondition: 'Bash(git *)',
      url: 'http://localhost:8080/hooks/pre-tool-use',
      timeout: 30,
      statusMessage: 'Checking command',
      headers: { Authorization: 'Bearer $TOKEN' },
      allowedEnvVars: ['TOKEN'],
      rawHook: {
        type: 'http',
        url: 'http://localhost:8080/hooks/pre-tool-use'
      }
    })
  })

  it('merges duplicate Claude hook child entries in the same scenario', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-duplicates-'))
    const settingsPath = join(root, 'settings.json')
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [
            {
              matcher: 'startup',
              hooks: [
                { type: 'command', command: 'python hook.py' },
                { command: 'python hook.py', type: 'command' }
              ]
            }
          ]
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'user')

    expect(hooks).toHaveLength(1)
    expect(hooks[0].meta).toMatchObject({
      command: 'python hook.py',
      occurrenceCount: 2,
      occurrences: [
        { handlerIndex: 0, hookIndex: 0, mode: 'nested' },
        { handlerIndex: 0, hookIndex: 1, mode: 'nested' }
      ]
    })
  })

  it('reads disabled Claude hook restore points from the Berth sidecar', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-sidecar-'))
    const settingsPath = join(root, 'settings.json')
    const sidecarDir = join(root, '.berth')
    const sidecarPath = join(sidecarDir, 'hooks-state.json')
    const hook = { type: 'command', command: 'python hook.py' }
    mkdirSync(sidecarDir, { recursive: true })
    writeFileSync(settingsPath, JSON.stringify({ hooks: {} }))
    writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          disabledHook: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: buildHookScenarioHash('SessionStart', 'startup'),
            containerTemplate: { matcher: 'startup' },
            hook,
            hookHash: buildHookHash(hook),
            removedCount: 2,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'user', { sidecarPath })

    expect(hooks).toHaveLength(1)
    expect(hooks[0].meta).toMatchObject({
      eventType: 'SessionStart',
      matcher: 'startup',
      command: 'python hook.py',
      enabled: false,
      effectiveEnabled: false,
      canToggleHook: true,
      toggleStrategy: 'soft-remove',
      stateSourcePath: sidecarPath,
      disabledByBerth: true,
      disabledAt: '2026-06-01T00:00:00.000Z',
      removedCount: 2,
      occurrenceCount: 2
    })
    expect(hooks[0].meta.hookKey).toEqual(expect.stringMatching(/^claude-code:/))
  })

  it('scans disabled Claude hook sidecar entries even when settings.json is missing', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-missing-settings-sidecar-'))
    const claudeDir = join(root, '.claude')
    const settingsPath = join(claudeDir, 'settings.json')
    const sidecarDir = join(claudeDir, '.berth')
    const sidecarPath = join(sidecarDir, 'hooks-state.json')
    const hook = { type: 'command', command: 'python hook.py' }
    mkdirSync(sidecarDir, { recursive: true })
    writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          disabledHook: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: buildHookScenarioHash('SessionStart', 'startup'),
            containerTemplate: { matcher: 'startup' },
            hook,
            hookHash: buildHookHash(hook),
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )
    const errors: { path: string; type: string; message: string }[] = []

    const assets = scanCapabilities({ claudeDir, errors })
    const hooks = assets.filter((asset) => asset.type === 'hook')

    expect(errors).toEqual([])
    expect(hooks).toHaveLength(1)
    expect(hooks[0].path).toBe(settingsPath)
    expect(hooks[0].meta).toMatchObject({
      eventType: 'SessionStart',
      matcher: 'startup',
      command: 'python hook.py',
      enabled: false,
      effectiveEnabled: false,
      canToggleHook: true,
      toggleStrategy: 'soft-remove',
      stateSourcePath: sidecarPath,
      disabledByBerth: true
    })
  })

  it('hides disabled Claude sidecar entries when the same hook is active again', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-active-sidecar-'))
    const settingsPath = join(root, 'settings.json')
    const sidecarDir = join(root, '.berth')
    const sidecarPath = join(sidecarDir, 'hooks-state.json')
    const hook = { type: 'command', command: 'python hook.py' }
    mkdirSync(sidecarDir, { recursive: true })
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [hook] }]
        }
      })
    )
    writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          disabledHook: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: buildHookScenarioHash('SessionStart', 'startup'),
            hook,
            hookHash: buildHookHash(hook),
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )

    const hooks = parseHooks(settingsPath, 'user', { sidecarPath })

    expect(hooks).toHaveLength(1)
    expect(hooks[0].meta).toMatchObject({
      enabled: true
    })
    expect(hooks[0].meta.disabledByBerth).toBeUndefined()
  })

  it('keeps active Claude hooks when the sidecar cannot be parsed', () => {
    root = mkdtempSync(join(tmpdir(), 'berth-claude-hook-bad-sidecar-'))
    const claudeDir = join(root, '.claude')
    const sidecarDir = join(claudeDir, '.berth')
    const settingsPath = join(claudeDir, 'settings.json')
    const sidecarPath = join(sidecarDir, 'hooks-state.json')
    mkdirSync(sidecarDir, { recursive: true })
    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo start' }] }]
        }
      })
    )
    writeFileSync(sidecarPath, '{bad json')

    const errors: { path: string; type: string; message: string }[] = []
    const assets = scanCapabilities({ claudeDir, errors })

    expect(assets.filter((asset) => asset.type === 'hook')).toHaveLength(1)
    expect(errors).toEqual([
      expect.objectContaining({
        path: sidecarPath,
        type: 'hook-state'
      })
    ])
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
