import * as path from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// AGENTS.md is a cross-agent open standard: the Claude and Codex adapters both
// scan the same physical file, producing two rows that differ only by agentId.
// GH-113 T1 collapses them to one canonical asset via an explicit `dedupeKey`,
// preserving cross-agent visibility through `meta.readByAgentIds`.

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    readFileSync: vi.fn(() => '# Shared conventions\n@./CLAUDE.md\nbody'),
    statSync: vi.fn()
  }
})

import { parseAgentsMd, parseClaudeMd } from '../../src/main/adapters/claude-code/parsers'
import { parseCodexAgentsMd } from '../../src/main/adapters/codex/parsers'
import { mergeSharedConventions } from '../../src/main/engine/scanner'
import { resolveRelations } from '../../src/main/engine/relations'
import { dedupePathKey } from '../../src/shared/asset-dedupe'
import type { Asset } from '../../src/shared/types/asset'

describe('dedupePathKey', () => {
  it('case-folds on Windows so different-case paths share one key', () => {
    const a = dedupePathKey('C:\\Code\\react-zmage\\AGENTS.md', 'win32')
    const b = dedupePathKey('c:\\code\\react-zmage\\agents.md', 'win32')
    expect(a).toBe(b)
  })

  it('stays case-sensitive on POSIX', () => {
    const a = dedupePathKey('/home/me/proj/AGENTS.md', 'linux')
    const b = dedupePathKey('/home/me/proj/agents.md', 'linux')
    expect(a).not.toBe(b)
  })
})

describe('AGENTS.md parsers carry dedup identity', () => {
  beforeEach(() => vi.clearAllMocks())

  it('claude parseAgentsMd emits dedupeKey, readByAgentIds, and a STABLE id', () => {
    const fp = 'D:\\Code\\react-zmage\\AGENTS.md'
    const first = parseAgentsMd(fp, 'project')
    const second = parseAgentsMd(fp, 'project')

    expect(first.agentId).toBe('claude-code')
    expect(first.meta.dedupeKey).toBe(dedupePathKey(fp))
    expect(first.meta.readByAgentIds).toEqual(['claude-code'])
    // id must be deterministic across scans (consumed as an opaque handle by
    // runtime/view-raw-button/instructions — Codex round-2 A1).
    expect(first.id).toBe(second.id)
  })

  it('claude parseClaudeMd emits a STABLE deterministic id (no Date.now flicker)', () => {
    // CLAUDE.md is claude-only (no dedupeKey), but its id must still be stable so
    // shallow-indexed CLAUDE.md does not re-key on every global rescan. (T4 / A4)
    const fp = 'D:\\Code\\proj\\CLAUDE.md'
    const first = parseClaudeMd(fp, 'project')
    const second = parseClaudeMd(fp, 'project')
    expect(first.id).toBe(second.id)
  })

  it('codex parseCodexAgentsMd emits the same dedupeKey + its own readByAgentIds', () => {
    const fp = 'D:\\Code\\react-zmage\\AGENTS.md'
    const claude = parseAgentsMd(fp, 'project')
    const codex = parseCodexAgentsMd(fp, 'project')

    expect(codex.agentId).toBe('codex')
    expect(codex.meta.dedupeKey).toBe(claude.meta.dedupeKey)
    expect(codex.meta.readByAgentIds).toEqual(['codex'])
  })
})

describe('mergeSharedConventions', () => {
  it('collapses the same physical AGENTS.md across adapters into one canonical row', () => {
    const fp = 'D:\\Code\\react-zmage\\AGENTS.md'
    const claude = parseAgentsMd(fp, 'project')
    const codex = parseCodexAgentsMd(fp, 'project')

    const merged = mergeSharedConventions([claude, codex])

    expect(merged).toHaveLength(1)
    expect(merged[0]?.agentId).toBe('claude-code') // claude-code primary
    expect(merged[0]?.id).toBe(claude.id) // canonical keeps primary's stable id
    expect(merged[0]?.meta.readByAgentIds).toEqual(['claude-code', 'codex'])
    expect(merged[0]?.meta.dedupeKey).toBe(claude.meta.dedupeKey)
  })

  it('preserves array order, emitting the merged row at the first member position', () => {
    const fp = 'D:\\Code\\react-zmage\\AGENTS.md'
    const claude = parseAgentsMd(fp, 'project')
    const codex = parseCodexAgentsMd(fp, 'project')
    const before = skillAsset('before')
    const after = skillAsset('after')

    const merged = mergeSharedConventions([before, claude, codex, after])

    expect(merged.map((a) => a.id)).toEqual([before.id, claude.id, after.id])
  })

  it('is idempotent — merging an already-merged set is a no-op', () => {
    const fp = 'D:\\Code\\react-zmage\\AGENTS.md'
    const once = mergeSharedConventions([parseAgentsMd(fp, 'project'), parseCodexAgentsMd(fp, 'project')])
    const twice = mergeSharedConventions(once)
    expect(twice).toHaveLength(1)
    expect(twice[0]?.id).toBe(once[0]?.id)
    expect(twice[0]?.meta.readByAgentIds).toEqual(['claude-code', 'codex'])
  })

  it('keeps a single-adapter AGENTS.md untouched (readByAgentIds stays singular)', () => {
    const claudeOnly = parseAgentsMd('D:\\solo\\AGENTS.md', 'project')
    const merged = mergeSharedConventions([claudeOnly])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.meta.readByAgentIds).toEqual(['claude-code'])
  })

  it('does NOT merge multi-entity files that lack a dedupeKey (settings.json hooks)', () => {
    const path = 'C:\\Users\\me\\.claude\\settings.json'
    const hookA = hookAsset('hook-a', path)
    const hookB = hookAsset('hook-b', path)
    const merged = mergeSharedConventions([hookA, hookB])
    expect(merged).toHaveLength(2)
  })

  it('does NOT merge skills/plugins (no dedupeKey) even at the same path', () => {
    const s1 = { ...skillAsset('s1'), path: 'C:\\shared\\SKILL.md' }
    const s2 = { ...skillAsset('s2'), path: 'C:\\shared\\SKILL.md', agentId: 'codex' }
    const merged = mergeSharedConventions([s1, s2])
    expect(merged).toHaveLength(2)
  })
})

describe('relations point at the merged canonical id', () => {
  it('CLAUDE.md @AGENTS.md import resolves to the merged AGENTS.md id', () => {
    // Build paths with the host `path` module so dirname/resolve are consistent
    // on both POSIX (CI) and Windows — backslash literals are not portable.
    const dir = path.resolve('react-zmage')
    const agentsPath = path.join(dir, 'AGENTS.md')
    const merged = mergeSharedConventions([
      parseAgentsMd(agentsPath, 'project'),
      parseCodexAgentsMd(agentsPath, 'project')
    ])[0]!
    const claudeMd: Asset = {
      id: 'claude-md-1',
      agentId: 'claude-code',
      category: 'instruction',
      type: 'claude-md',
      scope: 'project',
      name: 'CLAUDE.md',
      path: path.join(dir, 'CLAUDE.md'),
      meta: { imports: ['AGENTS.md'] }
    }

    const relations = resolveRelations(claudeMd, [claudeMd, merged])
    const importRel = relations.find((r) => r.kind === 'imports')
    expect(importRel?.to).toBe(merged.id)
  })
})

function skillAsset(id: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: id,
    path: `C:\\Users\\me\\.claude\\skills\\${id}\\SKILL.md`,
    meta: {}
  }
}

function hookAsset(id: string, path: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: 'capability',
    type: 'hook',
    scope: 'user',
    name: id,
    path,
    meta: { scenarioHash: id, hookHash: id }
  }
}
