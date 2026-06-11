import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join, sep } from 'path'
import { tmpdir } from 'os'
import { scanProjectCapabilities } from '@berth/scan-engine/engine/shallow-conventions'
import { deriveAssetsForPath } from '@berth/scan-engine/engine/assets/derive-asset'
import { getAssetWatchPaths } from '@berth/scan-engine/engine/watcher'

// GH-115 T9 等价钉测: 扫描源表三方收口 (shallow / derive / watch) 前先把现行为
// 按 fixture 钉死 — 接表重构后本测试必须原样保持绿 (枚举输出 diff 为空)。

let root: string

const FIXTURES: { rel: string; content: string }[] = [
  { rel: join('.claude', 'skills', 'sk', 'SKILL.md'), content: '---\nname: sk\ndescription: d\n---\nbody' },
  { rel: join('.claude', 'agents', 'agent-a.md'), content: '---\nname: agent-a\n---\nbody' },
  { rel: join('.claude', 'commands', 'cmd-c.md'), content: '# cmd' },
  { rel: join('.claude', 'output-styles', 'style-o.md'), content: '---\nname: style-o\n---\n' },
  { rel: join('.agents', 'skills', 'csk', 'SKILL.md'), content: '---\nname: csk\ndescription: d\n---\n' },
  { rel: join('.codex', 'agents', 'cagent.toml'), content: 'name = "cagent"\n' },
  { rel: '.mcp.json', content: '{"mcpServers":{"srv":{"command":"x"}}}' },
  { rel: join('.claude', 'settings.json'), content: '{"mcpServers":{"s2":{"command":"y"}},"env":{"K":"V"}}' },
  { rel: join('.claude', 'settings.local.json'), content: '{"env":{"L":"W"}}' },
  { rel: join('.codex', 'config.toml'), content: '[mcp_servers.cs]\ncommand = "z"\n' },
  { rel: join('.codex', 'hooks.json'), content: '{"hooks":{"SessionStart":[{"command":"h"}]}}' }
]

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'berth-sources-eq-'))
  for (const f of FIXTURES) {
    mkdirSync(join(root, f.rel, '..'), { recursive: true })
    writeFileSync(join(root, f.rel), f.content)
  }
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const relType = (assets: { type: string; path: string }[]): string[] =>
  assets
    .map((a) => `${a.type}:${a.path.slice(root.length + 1).split(sep).join('/')}`)
    .sort()

describe('asset source tables equivalence (T9 接表前后不变)', () => {
  it('shallow scanProjectCapabilities enumerates the full root-level capability surface', () => {
    expect(relType(scanProjectCapabilities(root))).toEqual([
      'agent:.claude/agents/agent-a.md',
      'agent:.codex/agents/cagent.toml',
      'command:.claude/commands/cmd-c.md',
      'env:.claude/settings.json',
      'env:.claude/settings.local.json',
      'hook:.codex/hooks.json',
      'mcp-server:.claude/settings.json',
      'mcp-server:.codex/config.toml',
      'mcp-server:.mcp.json',
      'output-mode:.claude/output-styles/style-o.md',
      'skill:.agents/skills/csk/SKILL.md',
      'skill:.claude/skills/sk/SKILL.md'
    ])
  })

  it('derive deriveAssetsForPath resolves every capability fixture to the same parser family', () => {
    const byFile = FIXTURES.map((f) => {
      const derived = deriveAssetsForPath(join(root, f.rel), { projectRoots: [root] })
      return `${f.rel.split(sep).join('/')} -> ${derived === null ? 'null' : derived.map((a) => a.type).sort().join(',') || 'empty'}`
    })
    expect(byFile).toEqual([
      '.claude/skills/sk/SKILL.md -> skill',
      '.claude/agents/agent-a.md -> agent',
      '.claude/commands/cmd-c.md -> command',
      '.claude/output-styles/style-o.md -> output-mode',
      '.agents/skills/csk/SKILL.md -> skill',
      '.codex/agents/cagent.toml -> agent',
      '.mcp.json -> mcp-server',
      '.claude/settings.json -> env,mcp-server',
      '.claude/settings.local.json -> env',
      '.codex/config.toml -> mcp-server',
      '.codex/hooks.json -> hook'
    ])
  })

  it('watcher project watch targets stay the agreed six-entry set', () => {
    const projectEntries = getAssetWatchPaths(root)
      .filter((p) => p.startsWith(root))
      .map((p) => p.slice(root.length + 1).split(sep).join('/'))
      .sort()
    expect(projectEntries).toEqual(['.agents/skills', '.claude', '.codex', '.mcp.json', 'AGENTS.md', 'CLAUDE.md'])
  })
})
