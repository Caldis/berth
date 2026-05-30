import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { parse as parseToml } from 'smol-toml'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAgentHooksStatus, setAgentHooksEnabled, setHookEnabled } from '../../src/main/engine/hooks-manager'

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

  it('writes Codex single hook state under hooks.state', () => {
    const configPath = path.join(tempDir!, '.codex', 'config.toml')
    const hookSourcePath = path.join(tempDir!, '.codex', 'hooks.json')
    const hookKey = `${hookSourcePath}:stop:0:0`
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
    ).toThrow(/only supports Codex/)

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
})
