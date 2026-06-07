import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { deriveAssetsForPath } from '../../src/main/engine/assets/derive-asset'

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

  it('returns null for file types not yet supported incrementally (caller falls back)', () => {
    const filePath = write(path.join('.claude', 'settings.json'), '{}')
    expect(deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })).toBeNull()
  })

  it('returns an empty set for a deleted/unreadable convention file', () => {
    const filePath = path.join(projectRoot, 'CLAUDE.md') // never written
    expect(deriveAssetsForPath(filePath, { projectRoots: [projectRoot] })).toEqual([])
  })
})
