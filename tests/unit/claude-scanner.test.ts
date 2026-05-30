import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scanState } from '../../src/main/adapters/claude-code/scanner'
import { parseHooks } from '../../src/main/adapters/claude-code/parsers'

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
})
