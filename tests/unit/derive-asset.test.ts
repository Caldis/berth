import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { deriveAssetsForPath } from '../../src/main/engine/assets/derive-asset'
import { dedupePathKey } from '../../src/shared/asset-dedupe'

// GH-113 I1: re-derive a single changed file's assets so the watcher can replace
// just that file (no full rescan). This slice covers root-level convention files;
// capability files (skills/settings/...) return null → caller falls back to a
// full refresh. Real parsers read the fixture from disk.

let projectRoot: string

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-derive-'))
})
afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true })
})

function write(rel: string, body = '# body'): string {
  const filePath = path.join(projectRoot, rel)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, body)
  return filePath
}

describe('deriveAssetsForPath (GH-113 I1)', () => {
  it('derives a project-scoped claude-md from CLAUDE.md', () => {
    const filePath = write('CLAUDE.md', '# project conventions')
    const assets = deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })
    expect(assets).toHaveLength(1)
    expect(assets![0]).toMatchObject({ type: 'claude-md', agentId: 'claude-code', scope: 'project' })
    expect(assets![0].meta.sourceKey).toBeTruthy()
  })

  it('derives a user-scoped claude-md when the file is outside the project roots', () => {
    const filePath = write('CLAUDE.md')
    const assets = deriveAssetsForPath(filePath, { projectRoots: [path.join(os.tmpdir(), 'unrelated-project')] })
    expect(assets![0].scope).toBe('user')
  })

  it('derives both adapter rows for AGENTS.md (collapsed later by mergeSharedConventions)', () => {
    const filePath = write('AGENTS.md', '# shared standard')
    const assets = deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })
    expect(assets).toHaveLength(2)
    expect(assets!.map((a) => a.agentId).sort()).toEqual(['claude-code', 'codex'])
    expect(assets!.every((a) => a.type === 'agents-md')).toBe(true)
    // identical dedupeKey is what lets the engine collapse them into one canonical row
    expect(assets![0].meta.dedupeKey).toBe(assets![1].meta.dedupeKey)
  })

  it('derives a claude-md from CLAUDE.local.md', () => {
    const filePath = write('CLAUDE.local.md')
    expect(deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })![0].type).toBe('claude-md')
  })

  it('derives a multi-asset .claude/settings.json (mcp+hooks+permission+env+statusline), all one sourceKey', () => {
    const filePath = write(
      path.join('.claude', 'settings.json'),
      JSON.stringify({
        mcpServers: { g: { command: 'x' } },
        hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo a' }] }] },
        permissions: { allow: ['Bash(x)'], deny: ['Bash(y)'] },
        env: { A: '1' },
        statusLine: { type: 'command', command: 's' }
      })
    )
    const assets = deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })
    expect(assets).not.toBeNull()
    expect(new Set(assets!.map((a) => a.type))).toEqual(
      new Set(['mcp-server', 'hook', 'permission', 'env', 'statusline'])
    )
    expect(assets!.every((a) => a.scope === 'project')).toBe(true)
    // every row keyed on the one file → applyFileChange replaces them all together
    expect(assets!.every((a) => a.meta.sourceKey === dedupePathKey(filePath))).toBe(true)
  })

  it('derives mcp servers from a project .mcp.json', () => {
    const filePath = write('.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'x' }, b: { command: 'y' } } }))
    const assets = deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })
    expect(assets).toHaveLength(2)
    expect(assets!.every((a) => a.type === 'mcp-server' && a.scope === 'project')).toBe(true)
  })

  it('derives codex capability files: .codex/config.toml and .codex/hooks.json', () => {
    const cfg = write(path.join('.codex', 'config.toml'), '[mcp_servers.docs]\ncommand = "x"\n')
    const cfgAssets = deriveAssetsForPath(cfg, { projectRoots: [projectRoot] })
    expect(cfgAssets).not.toBeNull()
    expect(cfgAssets!.some((a) => a.type === 'mcp-server' && a.agentId === 'codex')).toBe(true)

    const hooks = write(
      path.join('.codex', 'hooks.json'),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo s' }] }] } })
    )
    const hookAssets = deriveAssetsForPath(hooks, { projectRoots: [projectRoot] })
    expect(hookAssets).not.toBeNull()
    expect(hookAssets!.some((a) => a.type === 'hook' && a.agentId === 'codex')).toBe(true)
  })

  it('infers user scope for a settings.json outside the project roots', () => {
    const filePath = write(path.join('.claude', 'settings.json'), JSON.stringify({ env: { A: '1' } }))
    const assets = deriveAssetsForPath(filePath, { projectRoots: [path.join(os.tmpdir(), 'unrelated-xyz')] })
    expect(assets!.length).toBeGreaterThan(0)
    expect(assets!.every((a) => a.scope === 'user')).toBe(true)
  })

  it('derives glob-class claude capabilities: skill / agent / command / output-mode (cap-2)', () => {
    const skill = write(path.join('.claude', 'skills', 'foo', 'SKILL.md'), '---\nname: foo\ndescription: d\n---\nbody')
    expect(deriveAssetsForPath(skill, { projectRoots: [projectRoot] })![0]).toMatchObject({ type: 'skill', scope: 'project' })
    const agent = write(path.join('.claude', 'agents', 'a.md'), '---\nname: a\ndescription: d\n---\nbody')
    expect(deriveAssetsForPath(agent, { projectRoots: [projectRoot] })![0].type).toBe('agent')
    const cmd = write(path.join('.claude', 'commands', 'c.md'), 'do a thing')
    expect(deriveAssetsForPath(cmd, { projectRoots: [projectRoot] })![0].type).toBe('command')
    const om = write(path.join('.claude', 'output-styles', 'o.md'), '---\nname: o\ndescription: d\n---\nbody')
    expect(deriveAssetsForPath(om, { projectRoots: [projectRoot] })![0].type).toBe('output-mode')
  })

  it('derives glob-class codex capabilities: skill (.agents/skills) + custom agent (.codex/agents) (cap-2)', () => {
    const skill = write(path.join('.agents', 'skills', 'cs', 'SKILL.md'), '---\nname: cs\ndescription: d\n---\nbody')
    expect(deriveAssetsForPath(skill, { projectRoots: [projectRoot] })!.some((a) => a.type === 'skill' && a.agentId === 'codex')).toBe(true)
    const agent = write(path.join('.codex', 'agents', 'ca.toml'), 'description = "d"\n')
    expect(deriveAssetsForPath(agent, { projectRoots: [projectRoot] })!.some((a) => a.type === 'agent' && a.agentId === 'codex')).toBe(true)
  })

  it('stamps the per-file sourceKey on a glob-class derived asset, scope project (cap-2)', () => {
    const skill = write(path.join('.claude', 'skills', 'foo', 'SKILL.md'), '---\nname: foo\ndescription: d\n---\nbody')
    const asset = deriveAssetsForPath(skill, { projectRoots: [projectRoot] })![0]
    expect(asset.meta.sourceKey).toBe(dedupePathKey(skill))
    expect(asset.scope).toBe('project')
  })

  it('returns null for a truly unsupported file (plugin/session/plain — cap-3+)', () => {
    const filePath = write('notes.txt', 'hello')
    expect(deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })).toBeNull()
  })

  it('returns an empty set for a deleted/unreadable convention file', () => {
    const filePath = path.join(projectRoot, 'CLAUDE.md') // never written
    expect(deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })).toEqual([])
  })
})
