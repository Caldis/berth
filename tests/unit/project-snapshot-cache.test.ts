import { describe, it, expect } from 'vitest'
import { ProjectSnapshotCache } from '@berth/scan-engine/engine/assets/project-snapshot-cache'
import type { AssetSnapshot } from '@shared/types/ipc'

// GH-122 T2: per-project snapshot cache with the normalized-path key folded in
// (previously a bare Map + projectKey() idiom spread across 5 call sites).
function snapshot(id: string): AssetSnapshot {
  return {
    id,
    projectDir: undefined,
    assets: [],
    stats: { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
    errors: [],
    sources: [],
    projectCandidates: [],
    status: { state: 'ready', stale: false }
  }
}

describe('ProjectSnapshotCache', () => {
  it('stores and serves a snapshot per project dir', () => {
    const cache = new ProjectSnapshotCache()
    cache.set('D:/proj/a', snapshot('a'))

    expect(cache.has('D:/proj/a')).toBe(true)
    expect(cache.get('D:/proj/a')?.id).toBe('a')
  })

  it('normalizes path variants to the same key', () => {
    const cache = new ProjectSnapshotCache()
    cache.set('D:/proj/a', snapshot('a'))

    expect(cache.has('D:/proj/a/')).toBe(true)
    expect(cache.get('D:\\proj\\a')?.id).toBe('a')
  })

  it('treats undefined as the global entry, distinct from any project', () => {
    const cache = new ProjectSnapshotCache()
    cache.set(undefined, snapshot('global'))

    expect(cache.has(undefined)).toBe(true)
    expect(cache.get(undefined)?.id).toBe('global')
    expect(cache.has('D:/proj/a')).toBe(false)
  })

  it('returns undefined / false on a miss', () => {
    const cache = new ProjectSnapshotCache()
    expect(cache.has('D:/none')).toBe(false)
    expect(cache.get('D:/none')).toBeUndefined()
  })
})
