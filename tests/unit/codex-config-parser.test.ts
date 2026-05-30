import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  parseCodexConfig,
  parseCodexCustomAgent,
  parseCodexHooksJson
} from '../../src/main/adapters/codex/parsers'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-config-'))
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('Codex config parser', () => {
  it('parses mcp servers and hooks from config.toml', () => {
    const configPath = path.join(tempDir!, 'config.toml')
    const hookPath = path.join(tempDir!, 'hook.py')
    fs.writeFileSync(hookPath, 'print("hook")\n')
    fs.writeFileSync(
      configPath,
      [
        '[mcp_servers.github]',
        'command = "gh"',
        'args = ["mcp", "serve"]',
        '',
        '[[hooks.PreToolUse]]',
        'matcher = "Bash"',
        '[[hooks.PreToolUse.hooks]]',
        'type = "command"',
        'command = "python hook.py"',
        'command_windows = "py hook.py"',
        'enabled = true'
      ].join('\n')
    )

    const assets = parseCodexConfig(configPath, 'user')

    expect(assets).toHaveLength(2)
    expect(assets[0]).toMatchObject({
      agentId: 'codex',
      category: 'capability',
      type: 'mcp-server',
      scope: 'user',
      name: 'github',
      path: configPath
    })
    expect(assets[1]).toMatchObject({
      agentId: 'codex',
      category: 'capability',
      type: 'hook',
      scope: 'user',
      name: 'python hook.py',
      path: configPath,
      meta: {
        event: 'PreToolUse',
        matcher: 'Bash',
        command: 'python hook.py',
        commandWindows: 'py hook.py',
        hookType: 'command',
        enabled: true,
        entryPaths: [hookPath]
      }
    })
  })

  it('parses hooks.json and records skipped Codex hook handlers', () => {
    const hooksPath = path.join(tempDir!, 'hooks.json')
    const stopHookPath = path.join(tempDir!, 'stop.ps1')
    fs.writeFileSync(stopHookPath, 'Write-Output stop\n')
    fs.writeFileSync(
      hooksPath,
      JSON.stringify({
        hooks: {
          Stop: [
            {
              matcher: 'main',
              managed: true,
              hooks: [
                { type: 'command', command: `pwsh "${stopHookPath}"`, disabled: true },
                { type: 'prompt', command: 'prompt text' },
                { type: 'command', command: 'echo async', async: true }
              ]
            }
          ]
        }
      })
    )

    const assets = parseCodexHooksJson(hooksPath, 'user')

    expect(assets).toHaveLength(3)
    expect(assets[0]).toMatchObject({
      agentId: 'codex',
      category: 'capability',
      type: 'hook',
      scope: 'user',
      name: `pwsh "${stopHookPath}"`,
      path: hooksPath,
      meta: {
        eventType: 'Stop',
        matcher: 'main',
        command: `pwsh "${stopHookPath}"`,
        hookType: 'command',
        managed: true,
        enabled: false,
        entryPaths: [stopHookPath]
      }
    })
    expect(assets[1].meta.supportNote).toBe('capabilities.hooks.management.codexUnsupportedHookType')
    expect(assets[2].meta.supportNote).toBe('capabilities.hooks.management.codexAsyncHookSkipped')
  })

  it('detects Codex hook entry files from project-root and config-dir variables', () => {
    const projectDir = path.join(tempDir!, 'project')
    const codexDir = path.join(projectDir, '.codex')
    const hooksDir = path.join(codexDir, 'hooks')
    const hooksPath = path.join(codexDir, 'hooks.json')
    const preHookPath = path.join(hooksDir, 'pre_tool.py')
    const stopHookPath = path.join(hooksDir, 'stop.ps1')
    fs.mkdirSync(hooksDir, { recursive: true })
    fs.writeFileSync(preHookPath, 'print("pre")\n')
    fs.writeFileSync(stopHookPath, 'Write-Output stop\n')
    fs.writeFileSync(
      hooksPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'python "$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool.py"',
                  command_windows: 'pwsh "$CODEX_HOME/hooks/stop.ps1"'
                }
              ]
            }
          ]
        }
      })
    )

    const assets = parseCodexHooksJson(hooksPath, 'project')

    expect(assets[0].meta.entryPaths).toEqual([preHookPath, stopHookPath])
  })

  it('applies Codex hooks.state without parsing state as a hook event', () => {
    const configPath = path.join(tempDir!, 'config.toml')
    const hookKey = `${configPath}:pre_tool_use:0:0`
    fs.writeFileSync(
      configPath,
      [
        '[hooks.state]',
        `${JSON.stringify(hookKey)} = { enabled = false }`,
        '',
        '[[hooks.PreToolUse]]',
        'matcher = "Bash"',
        '[[hooks.PreToolUse.hooks]]',
        'type = "command"',
        'command = "python hook.py"'
      ].join('\n')
    )

    const hooks = parseCodexConfig(configPath, 'user').filter((asset) => asset.type === 'hook')

    expect(hooks).toHaveLength(1)
    expect(hooks[0]).toMatchObject({
      meta: {
        eventType: 'PreToolUse',
        hookKey,
        enabled: false,
        canToggleHook: true,
        stateSourcePath: configPath
      }
    })
  })

  it('applies adjacent Codex config hooks.state to hooks.json assets', () => {
    const hooksPath = path.join(tempDir!, 'hooks.json')
    const configPath = path.join(tempDir!, 'config.toml')
    const hookKey = `${hooksPath}:stop:0:0`
    fs.writeFileSync(
      configPath,
      [
        '[hooks.state]',
        `${JSON.stringify(hookKey)} = { enabled = false }`
      ].join('\n')
    )
    fs.writeFileSync(
      hooksPath,
      JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }]
        }
      })
    )

    const hooks = parseCodexHooksJson(hooksPath, 'user')

    expect(hooks).toHaveLength(1)
    expect(hooks[0].meta).toMatchObject({
      hookKey,
      enabled: false,
      canToggleHook: true,
      stateSourcePath: configPath
    })
  })

  it('parses Codex TUI status line items from config.toml', () => {
    const configPath = path.join(tempDir!, 'config.toml')
    fs.writeFileSync(
      configPath,
      [
        '[tui]',
        'status_line = ["model-with-reasoning", "current-dir", "unknown-future-item"]',
        'status_line_use_colors = false'
      ].join('\n')
    )

    const assets = parseCodexConfig(configPath, 'user')

    expect(assets).toEqual([
      expect.objectContaining({
        agentId: 'codex',
        category: 'capability',
        type: 'statusline',
        scope: 'user',
        name: 'TUI Status Line',
        path: configPath,
        meta: expect.objectContaining({
          provider: 'codex',
          settingKey: 'tui.status_line',
          statusLineKind: 'footer-items',
          items: ['model-with-reasoning', 'current-dir', 'unknown-future-item'],
          knownItems: ['model-with-reasoning', 'current-dir'],
          unknownItems: ['unknown-future-item'],
          useThemeColors: false
        })
      })
    ])
  })

  it('does not create a Codex statusline asset when status_line is unset', () => {
    const configPath = path.join(tempDir!, 'config.toml')
    fs.writeFileSync(
      configPath,
      [
        '[tui]',
        'status_line_use_colors = true'
      ].join('\n')
    )

    const assets = parseCodexConfig(configPath, 'user')

    expect(assets.filter((asset) => asset.type === 'statusline')).toEqual([])
  })

  it('keeps an empty Codex status_line as an explicit hidden statusline asset', () => {
    const configPath = path.join(tempDir!, 'config.toml')
    fs.writeFileSync(
      configPath,
      [
        '[tui]',
        'status_line = []'
      ].join('\n')
    )

    const assets = parseCodexConfig(configPath, 'user')

    expect(assets.filter((asset) => asset.type === 'statusline')).toEqual([
      expect.objectContaining({
        meta: expect.objectContaining({
          items: [],
          hidden: true
        })
      })
    ])
  })

  it('parses standalone custom agent TOML', () => {
    const agentPath = path.join(tempDir!, 'reviewer.toml')
    fs.writeFileSync(
      agentPath,
      [
        'name = "reviewer"',
        'description = "Reviews code changes."',
        'developer_instructions = "Focus on correctness."'
      ].join('\n')
    )

    const asset = parseCodexCustomAgent(agentPath, 'project')

    expect(asset).toMatchObject({
      agentId: 'codex',
      category: 'instruction',
      type: 'agent',
      scope: 'project',
      name: 'reviewer',
      path: agentPath,
      meta: {
        description: 'Reviews code changes.',
        developer_instructions: 'Focus on correctness.'
      }
    })
  })

  it('throws on invalid TOML', () => {
    const configPath = path.join(tempDir!, 'bad.toml')
    fs.writeFileSync(configPath, '[mcp_servers.github\ncommand = "gh"')

    expect(() => parseCodexConfig(configPath, 'user')).toThrow()
    expect(() => parseCodexCustomAgent(configPath, 'user')).toThrow()
  })
})
