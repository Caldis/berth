import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  parseCodexConfig,
  parseCodexCustomAgent
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
        'command_windows = "py hook.py"'
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
        hookType: 'command'
      }
    })
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
