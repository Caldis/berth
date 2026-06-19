import { describe, it, expect, vi, afterEach } from 'vitest'
import MiniSearch from 'minisearch'
import { AssetSearch } from '../src/engine/search'
import type { Asset } from '@shared/types/asset'

// GH-145: createIndexSignature must (1) preserve identity — an unchanged asset
// list does NOT rebuild the MiniSearch index — and (2) escape its field/row
// separators so two genuinely different lists cannot forge an equal signature
// (the pseudo-equality bug that would skip a needed rebuild).

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

describe('AssetSearch.ensureIndexed signature (GH-145)', () => {
  it('does not rebuild when the asset list content is unchanged', () => {
    const search = new AssetSearch()
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')

    const list = [asset({ id: 'a1', name: 'one' }), asset({ id: 'a2', name: 'two' })]
    search.ensureIndexed(list)
    expect(addAll).toHaveBeenCalledTimes(1)

    // Same content, fresh array + fresh objects → signature equal → no rebuild.
    const sameContent = [asset({ id: 'a1', name: 'one' }), asset({ id: 'a2', name: 'two' })]
    search.ensureIndexed(sameContent)
    expect(addAll).toHaveBeenCalledTimes(1)
  })

  it('rebuilds when a field changes', () => {
    const search = new AssetSearch()
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')

    search.ensureIndexed([asset({ id: 'a1', name: 'one' })])
    expect(addAll).toHaveBeenCalledTimes(1)

    search.ensureIndexed([asset({ id: 'a1', name: 'changed' })])
    expect(addAll).toHaveBeenCalledTimes(2)
  })

  it('rebuilds for two lists that would collide without field escaping', () => {
    const search = new AssetSearch()
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')

    // The field order in the signature is [...,path, agentId,...]. Hiding a raw
    // field separator () inside `path` vs inside `agentId` makes the two
    // rows concatenate to the SAME byte string when fields are joined without
    // escaping — distinct assets, identical naive signature.
    const sep = ''
    const listA = [asset({ id: 'a1', path: `x${sep}y`, agentId: 'z' })]
    const listB = [asset({ id: 'a1', path: 'x', agentId: `y${sep}z` })]

    search.ensureIndexed(listA)
    expect(addAll).toHaveBeenCalledTimes(1)

    // With escaping the signatures differ → a rebuild must happen. A regression
    // (no escaping) would treat them as equal and skip this second rebuild.
    search.ensureIndexed(listB)
    expect(addAll).toHaveBeenCalledTimes(2)
  })
})
