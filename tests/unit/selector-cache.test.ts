import { describe, it, expect, vi } from 'vitest'
import { SnapshotSelectorCache } from '@berth/scan-engine/engine/assets/selector-cache'
import type { AssetSnapshot } from '@shared/types/ipc'

// GH-122 T1: the selector cache is keyed by snapshot.id — derivations are reused
// while the snapshot is unchanged and recomputed exactly once per new snapshot.
function snapshotWithId(id: string): AssetSnapshot {
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

describe('SnapshotSelectorCache', () => {
  it('reuses the derived value while snapshot.id is unchanged', () => {
    const cache = new SnapshotSelectorCache()
    const derive = vi.fn(() => ({ token: Math.random() }))
    const snap = snapshotWithId('a')

    const first = cache.select('k', snap, derive)
    const second = cache.select('k', snap, derive)

    expect(second).toBe(first)
    expect(derive).toHaveBeenCalledTimes(1)
  })

  it('re-derives when the snapshot id changes', () => {
    const cache = new SnapshotSelectorCache()
    const derive = vi.fn((s: AssetSnapshot) => s.id)

    expect(cache.select('k', snapshotWithId('a'), derive)).toBe('a')
    expect(cache.select('k', snapshotWithId('b'), derive)).toBe('b')
    expect(derive).toHaveBeenCalledTimes(2)
  })

  it('clear() drops cached values so the next select re-derives', () => {
    const cache = new SnapshotSelectorCache()
    const derive = vi.fn(() => 'v')
    const snap = snapshotWithId('a')

    cache.select('k', snap, derive)
    cache.clear()
    cache.select('k', snap, derive)

    expect(derive).toHaveBeenCalledTimes(2)
  })
})
