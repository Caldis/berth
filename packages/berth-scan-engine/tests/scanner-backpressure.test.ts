import { describe, it, expect } from 'vitest'
import { filterExcludedPaths } from '../src/engine/scanner'
import type { Asset } from '@shared/types/asset'

function asset(id: string, path: string): Asset {
  return { id, type: 'skill', name: id, path, scope: 'user', agentId: 'claude-code', meta: {} } as Asset
}

describe('scanner backpressure — exclude paths (GH-135 B4)', () => {
  it('returns assets unchanged (identity) when there are no excludes', () => {
    const assets = [asset('a', '/x/a'), asset('b', '/y/b')]
    expect(filterExcludedPaths(assets, undefined)).toBe(assets)
    expect(filterExcludedPaths(assets, [])).toBe(assets)
  })

  it('drops assets whose path is inside an excluded path', () => {
    const assets = [asset('keep', '/repo/src/a.md'), asset('drop', '/repo/node_modules/x/b.md')]
    expect(filterExcludedPaths(assets, ['/repo/node_modules']).map((a) => a.id)).toEqual(['keep'])
  })

  it('drops an asset whose path equals the excluded path exactly', () => {
    const assets = [asset('exact', '/repo/.git'), asset('other', '/repo/src/x.md')]
    expect(filterExcludedPaths(assets, ['/repo/.git']).map((a) => a.id)).toEqual(['other'])
  })

  it('keeps assets when no path matches any exclude', () => {
    const assets = [asset('a', '/repo/src/a.md'), asset('b', '/repo/lib/b.md')]
    expect(filterExcludedPaths(assets, ['/repo/node_modules', '/repo/dist']).map((a) => a.id)).toEqual(['a', 'b'])
  })
})
