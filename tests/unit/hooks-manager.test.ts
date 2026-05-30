import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAgentHooksStatus, setAgentHooksEnabled } from '../../src/main/engine/hooks-manager'

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
})
