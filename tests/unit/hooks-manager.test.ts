import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parse as parseToml } from 'smol-toml'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearHookRecovery,
  getAgentHooksStatus,
  getAgentHooksStatuses,
  getHookRecoveries,
  setAgentHooksEnabled,
  setHookEnabled
} from '../../src/main/engine/hooks-manager'
import { buildHookKey } from '../../src/shared/hook-identity'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-hooks-manager-'))
})

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('hooks manager', () => {
  it('reads and writes Claude Code disableAllHooks', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')

    expect(getAgentHooksStatus('claude-code', tempDir!).enabled).toBe(true)

    const result = setAgentHooksEnabled({ agentId: 'claude-code', scope: 'user', enabled: false }, tempDir!)

    expect(result.status.enabled).toBe(false)
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))).toMatchObject({
      disableAllHooks: true
    })
    expect(fs.existsSync(`${settingsPath}.bak`)).toBe(false)

    setAgentHooksEnabled({ agentId: 'claude-code', scope: 'user', enabled: true }, tempDir!)
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))).toMatchObject({
      disableAllHooks: false
    })
    expect(fs.existsSync(`${settingsPath}.bak`)).toBe(true)
    expect(fs.readdirSync(path.dirname(settingsPath)).some((name) =>
      name.startsWith('settings.json.') && name.endsWith('.bak')
    )).toBe(true)
  })

  it('reads and writes Codex features.hooks in config.toml', () => {
    const configPath = path.join(tempDir!, '.codex', 'config.toml')
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, ['model = "gpt-5.3-codex"', '[features]', 'goals = true'].join('\n'))

    const result = setAgentHooksEnabled({ agentId: 'codex', scope: 'user', enabled: false }, tempDir!)
    const written = fs.readFileSync(configPath, 'utf-8')

    expect(result.status.enabled).toBe(false)
    expect(written).toContain('[features]')
    expect(written).toContain('hooks = false')
    expect(written).toContain('goals = true')
    expect(getAgentHooksStatus('codex', tempDir!).enabled).toBe(false)

    setAgentHooksEnabled({ agentId: 'codex', scope: 'user', enabled: true }, tempDir!)
    expect(fs.readFileSync(configPath, 'utf-8')).toContain('hooks = true')
  })

  it('returns separate user and project hook statuses', () => {
    const projectDir = path.join(tempDir!, 'project')
    const userConfigPath = path.join(tempDir!, '.codex', 'config.toml')
    const projectConfigPath = path.join(projectDir, '.codex', 'config.toml')
    fs.mkdirSync(path.dirname(userConfigPath), { recursive: true })
    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true })
    fs.writeFileSync(userConfigPath, ['[features]', 'hooks = true'].join('\n'))
    fs.writeFileSync(projectConfigPath, ['[features]', 'hooks = false'].join('\n'))

    const statuses = getAgentHooksStatuses('codex', tempDir!, projectDir)

    expect(statuses).toEqual([
      expect.objectContaining({
        agentId: 'codex',
        scope: 'user',
        enabled: true,
        writable: true,
        sourcePath: userConfigPath
      }),
      expect.objectContaining({
        agentId: 'codex',
        scope: 'project',
        enabled: false,
        writable: false,
        reasonKey: 'capabilities.hooks.management.projectReadOnly',
        sourcePath: projectConfigPath
      })
    ])
  })

  it('writes Codex single hook state under hooks.state', () => {
    const configPath = path.join(tempDir!, '.codex', 'config.toml')
    const hookSourcePath = path.join(tempDir!, '.codex', 'hooks.json')
    const hookKey = buildHookKey('codex', 'Stop', undefined, { type: 'command', command: 'echo stop' })
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, ['model = "gpt-5.3-codex"', '[features]', 'hooks = true'].join('\n'))

    const result = setHookEnabled({
      agentId: 'codex',
      scope: 'user',
      hookKey,
      sourcePath: hookSourcePath,
      enabled: false
    }, tempDir!)
    const config = parseToml(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>
    const hooks = config.hooks as Record<string, unknown>
    const state = hooks.state as Record<string, { enabled: boolean }>

    expect(result).toMatchObject({
      hookKey,
      enabled: false,
      changed: true,
      sourcePath: configPath
    })
    expect(state[hookKey]).toEqual({ enabled: false })
    expect(fs.existsSync(`${configPath}.bak`)).toBe(true)
  })

  it('rejects unsupported single hook writes', () => {
    expect(() =>
      setHookEnabled({
        agentId: 'claude-code',
        scope: 'user',
        hookKey: 'ignored',
        sourcePath: 'settings.json',
        enabled: false
      }, tempDir!)
    ).toThrow(/user settings\.json/)

    expect(() =>
      setHookEnabled({
        agentId: 'codex',
        scope: 'user',
        hookKey: 'managed',
        sourcePath: 'requirements.toml',
        enabled: false,
        managed: true
      }, tempDir!)
    ).toThrow(/managed/)
  })

  it('soft-disables a Claude Code user hook by hook hash', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const duplicateTargetHook = { command: 'python hook.py', type: 'command' }
    const otherHook = { type: 'command', command: 'echo other' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [
            {
              matcher: 'startup',
              hooks: [targetHook, otherHook, duplicateTargetHook]
            }
          ]
        }
      }, null, 2)
    )

    const result = setHookEnabled({
      agentId: 'claude-code',
      scope: 'user',
      hookKey,
      sourcePath: settingsPath,
      enabled: false
    }, tempDir!)

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))

    expect(result).toMatchObject({
      hookKey,
      enabled: false,
      changed: true,
      sourcePath: settingsPath
    })
    expect(settings.hooks.SessionStart[0].hooks).toEqual([otherHook])
    expect(sidecar.disabled[hookKey]).toMatchObject({
      agentId: 'claude-code',
      sourcePath: settingsPath,
      scope: 'user',
      event: 'SessionStart',
      matcher: 'startup',
      mode: 'nested',
      hook: targetHook,
      removedCount: 2
    })
    expect(fs.existsSync(`${settingsPath}.bak`)).toBe(true)
  })

  it('retries Claude hook disable when the source changes before write and preserves unrelated edits', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    let writesObserved = 0
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        env: { EXISTING: '1' },
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [targetHook] }]
        }
      }, null, 2)
    )

    const result = setHookEnabled({
      agentId: 'claude-code',
      scope: 'user',
      hookKey,
      sourcePath: settingsPath,
      enabled: false
    }, tempDir!, {
      onBeforeClaudeSettingsWrite: () => {
        writesObserved += 1
        if (writesObserved !== 1) return
        const current = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        current.env.ADDED_EXTERNALLY = '1'
        fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2))
      }
    })
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))

    expect(result.changed).toBe(true)
    expect(writesObserved).toBe(2)
    expect(settings.env).toEqual({ EXISTING: '1', ADDED_EXTERNALLY: '1' })
    expect(settings.hooks).toEqual({})
  })

  it('stops Claude hook disable when the target hook changes during retry', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const changedHook = { type: 'command', command: 'python changed.py' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    let writesObserved = 0
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [targetHook] }]
        }
      }, null, 2)
    )

    expect(() =>
      setHookEnabled({
        agentId: 'claude-code',
        scope: 'user',
        hookKey,
        sourcePath: settingsPath,
        enabled: false
      }, tempDir!, {
        onBeforeClaudeSettingsWrite: () => {
          writesObserved += 1
          if (writesObserved !== 1) return
          fs.writeFileSync(
            settingsPath,
            JSON.stringify({
              hooks: {
                SessionStart: [{ matcher: 'startup', hooks: [changedHook] }]
              }
            }, null, 2)
          )
        }
      })
    ).toThrow(/hook target changed or was removed/)

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(settings.hooks.SessionStart[0].hooks).toEqual([changedHook])
  })

  it('restores a Claude Code hook from the Berth sidecar into the current matcher group', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const otherHook = { type: 'command', command: 'echo other' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [otherHook] }]
        }
      })
    )
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          [hookKey]: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: hookKey.split(':')[1],
            containerTemplate: { matcher: 'startup' },
            hook: targetHook,
            hookHash: hookKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )

    const result = setHookEnabled({
      agentId: 'claude-code',
      scope: 'user',
      hookKey,
      sourcePath: settingsPath,
      enabled: true
    }, tempDir!)
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))

    expect(result).toMatchObject({
      hookKey,
      enabled: true,
      changed: true,
      sourcePath: settingsPath
    })
    expect(settings.hooks.SessionStart[0].hooks).toEqual([otherHook, targetHook])
    expect(sidecar.disabled[hookKey]).toBeUndefined()
  })

  it('clears a Claude Code restore point when the hook already exists', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [targetHook] }]
        }
      })
    )
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          [hookKey]: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: hookKey.split(':')[1],
            hook: targetHook,
            hookHash: hookKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )

    const result = setHookEnabled({
      agentId: 'claude-code',
      scope: 'user',
      hookKey,
      sourcePath: settingsPath,
      enabled: true
    }, tempDir!)
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))

    expect(result.changed).toBe(false)
    expect(sidecar.disabled[hookKey]).toBeUndefined()
  })

  it('does not write settings when the Claude restore sidecar is invalid', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          SessionStart: [{ matcher: 'startup', hooks: [targetHook] }]
        }
      }, null, 2)
    )
    const before = fs.readFileSync(settingsPath, 'utf-8')
    fs.writeFileSync(sidecarPath, JSON.stringify({ version: 1, disabled: { [hookKey]: { broken: true } } }))

    expect(() =>
      setHookEnabled({
        agentId: 'claude-code',
        scope: 'user',
        hookKey,
        sourcePath: settingsPath,
        enabled: true
      }, tempDir!)
    ).toThrow(/Invalid Claude hooks state/)
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe(before)
  })

  it('lists Claude restore points by current recovery status', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const missingPath = path.join(tempDir!, '.claude', 'missing-settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const activeHook = { type: 'command', command: 'echo active' }
    const disabledHook = { type: 'http', url: 'http://localhost:8080/hooks/stop' }
    const missingHook = { type: 'prompt', prompt: 'Check whether this turn can stop.' }
    const activeKey = buildHookKey('claude-code', 'Stop', undefined, activeHook)
    const disabledKey = buildHookKey('claude-code', 'SessionStart', 'startup', disabledHook)
    const missingKey = buildHookKey('claude-code', 'UserPromptSubmit', undefined, missingHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          Stop: [{ hooks: [activeHook] }]
        }
      })
    )
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          [activeKey]: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'Stop',
            mode: 'nested',
            scenarioHash: activeKey.split(':')[1],
            hook: activeHook,
            hookHash: activeKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          },
          [disabledKey]: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: disabledKey.split(':')[1],
            hook: disabledHook,
            hookHash: disabledKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:01.000Z'
          },
          [missingKey]: {
            agentId: 'claude-code',
            sourcePath: missingPath,
            scope: 'user',
            event: 'UserPromptSubmit',
            mode: 'nested',
            scenarioHash: missingKey.split(':')[1],
            hook: missingHook,
            hookHash: missingKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:02.000Z'
          }
        }
      })
    )

    const result = getHookRecoveries(tempDir!)
    const pointsByKey = new Map(result.points.map((point) => [point.hookKey, point]))

    expect(result.issues).toEqual([])
    expect(pointsByKey.get(activeKey)).toMatchObject({
      status: 'already-restored',
      hookType: 'command',
      command: 'echo active',
      event: 'Stop'
    })
    expect(pointsByKey.get(disabledKey)).toMatchObject({
      status: 'recoverable',
      hookType: 'http',
      command: 'http://localhost:8080/hooks/stop',
      matcher: 'startup'
    })
    expect(pointsByKey.get(missingKey)).toMatchObject({
      status: 'source-missing',
      hookType: 'prompt',
      command: 'Check whether this turn can stop.'
    })
  })

  it('reports an invalid Claude restore sidecar without throwing', () => {
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(sidecarPath, JSON.stringify({ version: 1, disabled: { broken: { nope: true } } }))

    const result = getHookRecoveries(tempDir!)

    expect(result.points).toEqual([])
    expect(result.issues).toEqual([
      expect.objectContaining({
        agentId: 'claude-code',
        severity: 'error',
        sourcePath: sidecarPath,
        message: expect.stringContaining('Invalid Claude hooks state entry')
      })
    ])
  })

  it('clears a Claude restore point without changing the source settings', () => {
    const settingsPath = path.join(tempDir!, '.claude', 'settings.json')
    const sidecarPath = path.join(tempDir!, '.claude', '.berth', 'hooks-state.json')
    const targetHook = { type: 'command', command: 'python hook.py' }
    const hookKey = buildHookKey('claude-code', 'SessionStart', 'startup', targetHook)
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true })
    fs.writeFileSync(settingsPath, JSON.stringify({ hooks: { SessionStart: [] } }, null, 2))
    const beforeSettings = fs.readFileSync(settingsPath, 'utf-8')
    fs.writeFileSync(
      sidecarPath,
      JSON.stringify({
        version: 1,
        disabled: {
          [hookKey]: {
            agentId: 'claude-code',
            sourcePath: settingsPath,
            scope: 'user',
            event: 'SessionStart',
            mode: 'nested',
            matcher: 'startup',
            scenarioHash: hookKey.split(':')[1],
            hook: targetHook,
            hookHash: hookKey.split(':')[2],
            removedCount: 1,
            disabledAt: '2026-06-01T00:00:00.000Z'
          }
        }
      })
    )

    const result = clearHookRecovery({
      agentId: 'claude-code',
      hookKey,
      sourcePath: settingsPath
    }, tempDir!)
    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'))

    expect(result).toEqual({
      hookKey,
      sourcePath: settingsPath,
      changed: true
    })
    expect(sidecar.disabled[hookKey]).toBeUndefined()
    expect(fs.readFileSync(settingsPath, 'utf-8')).toBe(beforeSettings)
  })
})
