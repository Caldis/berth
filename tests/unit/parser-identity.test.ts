import { describe, it, expect, vi, beforeEach } from 'vitest'

// GH-113 Pre-T0b: every Claude parser must emit a deterministic, collision-safe
// id (was `makeId(Date.now())`). Identity = (type, scope, sourceKey, entityKey);
// entityKey is content/structure-derived, never a display name or handler index.

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return { ...actual, existsSync: vi.fn(() => false), readFileSync: vi.fn(), statSync: vi.fn() }
})

import * as fs from 'fs'
import {
  parseSkill,
  parseAgent,
  parseCommand,
  parseMcpServers,
  parseClaudeJsonProjectMcp,
  parseHooks,
  parsePermissions,
  parseEnv,
  parseStatuslinesFromSettings
} from '../../src/main/adapters/claude-code/parsers'
import { parseCodexAgentsMd, parseCodexSkill } from '../../src/main/adapters/codex/parsers'
import { assetEntityId } from '../../src/shared/asset-dedupe'
import { normalizeProjectPathKey } from '../../src/shared/scope'

const read = vi.mocked(fs.readFileSync)
function setContent(content: string): void {
  read.mockReturnValue(content)
}

beforeEach(() => vi.clearAllMocks())

describe('single-asset parsers key on path, not display name (rename-safe)', () => {
  it('parseSkill id is stable across scans and ignores the frontmatter name', () => {
    const fp = 'C:\\Users\\me\\.claude\\skills\\demo\\SKILL.md'
    setContent('---\nname: First Title\n---\nbody')
    const a = parseSkill(fp, 'user')
    setContent('---\nname: Renamed Title\n---\nbody')
    const b = parseSkill(fp, 'user')
    expect(a.id).toBe(b.id)
    expect(a.id).toBe(assetEntityId('skill', 'user', fp))
    expect(b.name).toBe('Renamed Title') // display name still updates
  })

  it('parseAgent / parseCommand are deterministic by path', () => {
    setContent('---\nname: a\n---\nbody')
    const ag = parseAgent('C:\\x\\.claude\\agents\\a.md', 'project')
    expect(ag.id).toBe(assetEntityId('agent', 'project', 'C:\\x\\.claude\\agents\\a.md'))
    setContent('body')
    const cmd = parseCommand('C:\\x\\.claude\\commands\\c.md', 'project')
    expect(cmd.id).toBe(assetEntityId('command', 'project', 'C:\\x\\.claude\\commands\\c.md'))
  })
})

describe('multi-asset files: entityKey disambiguates without collision', () => {
  it('parseMcpServers gives each server a distinct, stable id', () => {
    const fp = 'C:\\Users\\me\\.claude\\settings.json'
    setContent(JSON.stringify({ mcpServers: { github: { command: 'x' }, filesystem: { command: 'y' } } }))
    const a = parseMcpServers(fp, 'user')
    setContent(JSON.stringify({ mcpServers: { github: { command: 'x' }, filesystem: { command: 'y' } } }))
    const b = parseMcpServers(fp, 'user')
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
    expect(new Set(a.map((x) => x.id)).size).toBe(2)
    expect(a.find((x) => x.name === 'github')?.id).toBe(assetEntityId('mcp-server', 'user', fp, 'github'))
  })

  it('parseClaudeJsonProjectMcp disambiguates same server name across projects', () => {
    const fp = 'C:\\Users\\me\\.claude.json'
    setContent(JSON.stringify({
      projects: {
        'D:/Code/alpha': { mcpServers: { shared: { command: 'x' } } },
        'D:/Code/bravo': { mcpServers: { shared: { command: 'y' } } }
      }
    }))
    const assets = parseClaudeJsonProjectMcp(fp)
    expect(new Set(assets.map((a) => a.id)).size).toBe(2)
    expect(assets[0]?.id).toBe(
      assetEntityId('mcp-server', 'project', fp, `${normalizeProjectPathKey('D:/Code/alpha')}:shared`)
    )
  })

  it('parseHooks keys each hook on scenarioHash:hookHash, stable across scans', () => {
    const fp = 'C:\\Users\\me\\.claude\\settings.json'
    const settings = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo a' }] }] }
    })
    setContent(settings)
    const a = parseHooks(fp, 'user')
    setContent(settings)
    const b = parseHooks(fp, 'user')
    expect(a[0]?.id).toBe(b[0]?.id)
    expect(a[0]?.id).toBe(assetEntityId('hook', 'user', fp, `${a[0]?.meta.scenarioHash}:${a[0]?.meta.hookHash}`))
  })

  it('parsePermissions distinguishes allow vs deny at one path', () => {
    const fp = 'C:\\repo\\.claude\\settings.json'
    setContent(JSON.stringify({ permissions: { allow: ['Bash(x)'], deny: ['Bash(y)'] } }))
    const perms = parsePermissions(fp, 'project')
    expect(new Set(perms.map((p) => p.id)).size).toBe(2)
    expect(perms.find((p) => p.meta.kind === 'allow')?.id).toBe(assetEntityId('permission', 'project', fp, 'allow'))
  })

  it('Codex parsers use the same unified id scheme (AGENTS.md id matches Claude → mergeable)', () => {
    const fp = 'C:\\repo\\AGENTS.md'
    setContent('# shared\nbody')
    // Same scheme as Claude's parseAgentsMd → the two adapter rows share an id and
    // collapse cleanly via mergeSharedConventions.
    expect(parseCodexAgentsMd(fp, 'project').id).toBe(assetEntityId('agents-md', 'project', fp))
    setContent('---\nname: x\n---\nbody')
    expect(parseCodexSkill('C:\\repo\\.agents\\skills\\x\\SKILL.md', 'project').id).toBe(
      assetEntityId('skill', 'project', 'C:\\repo\\.agents\\skills\\x\\SKILL.md')
    )
  })

  it('parseEnv and parseStatuslines are deterministic', () => {
    const fp = 'C:\\Users\\me\\.claude\\settings.json'
    setContent(JSON.stringify({ env: { A: '1' }, statusLine: { type: 'command', command: 's' } }))
    const env = parseEnv(fp, 'user')
    expect(env[0]?.id).toBe(assetEntityId('env', 'user', fp, 'env'))
    setContent(JSON.stringify({ statusLine: { type: 'command', command: 's' } }))
    const sl = parseStatuslinesFromSettings(fp, 'user')
    expect(sl.find((s) => s.meta.settingKey === 'statusLine')?.id).toBe(
      assetEntityId('statusline', 'user', fp, 'statusLine')
    )
  })
})
