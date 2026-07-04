import { describe, it, expect, vi, afterEach } from 'vitest'
import MiniSearch from 'minisearch'
import { AssetSearch } from '../src/engine/search'
import type { Asset } from '@shared/types/asset'

// GH-152 T2 (supersedes GH-145): the dirty check is ARRAY REFERENCE equality.
// The runtime rebuilds `snapshot.assets` immutably on every content change
// (commit, partial fold, applyFileChange — the latter two under a STABLE
// snapshot id), so same-ref ⟺ same-content in O(1). GH-145's escaped content
// signature is gone with the mechanism it guarded: with reference identity
// there is no signature to forge, so separator-collision pseudo-equality is
// impossible by construction (an unequal reference always rebuilds).

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: 'a1',
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: 'demo',
    path: '/p/demo',
    meta: {},
    ...overrides
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AssetSearch.ensureIndexed dirty check (GH-152 T2)', () => {
  it('does not rebuild across queries on the same array reference', () => {
    const search = new AssetSearch()
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')

    const list = [asset({ id: 'a1', name: 'one' }), asset({ id: 'a2', name: 'two' })]
    search.ensureIndexed(list)
    expect(addAll).toHaveBeenCalledTimes(1)

    search.ensureIndexed(list) // same reference → same content → no rebuild
    expect(addAll).toHaveBeenCalledTimes(1)
  })

  it('rebuilds on a new reference — the runtime mints one per content change', () => {
    const search = new AssetSearch()
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')

    search.ensureIndexed([asset({ id: 'a1', name: 'one' })])
    expect(addAll).toHaveBeenCalledTimes(1)

    // Incremental fold under a stable snapshot id still swaps the array — the
    // changed asset must be searchable immediately.
    search.ensureIndexed([asset({ id: 'a1', name: 'changed' })])
    expect(addAll).toHaveBeenCalledTimes(2)
    expect(search.search('changed', [asset({ id: 'a1', name: 'changed' })]).map((r) => r.id)).toEqual(['a1'])
  })
})
