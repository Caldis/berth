import { describe, expect, it, vi } from 'vitest'
import MiniSearch from 'minisearch'
import { AssetSearch } from '@berth/scan-engine/engine/search'
import type { Asset, AssetCategory, AssetScope, AssetType } from '@shared/types/asset'

function asset(
  id: string,
  type: AssetType,
  meta: Record<string, unknown>,
  options: {
    name?: string
    category?: AssetCategory
    scope?: AssetScope
    agentId?: string
    path?: string
    raw?: string
  } = {}
): Asset {
  return {
    id,
    agentId: options.agentId ?? 'codex',
    category: options.category ?? (type === 'session' ? 'state' : 'capability'),
    type,
    scope: options.scope ?? 'user',
    name: options.name ?? id,
    path: options.path ?? `C:/Users/mail/.codex/${id}.json`,
    meta,
    raw: options.raw
  }
}

describe('AssetSearch', () => {
  it('matches common session, hook, MCP, and skill metadata', () => {
    const search = new AssetSearch()
    const assets = [
      asset('session-1', 'session', {
        project: 'berth',
        projectPath: 'D:/Code/berth',
        model: 'gpt-5',
        transcriptPath: 'C:/Users/mail/.codex/sessions/session-1.jsonl'
      }, { name: 'Fix global search' }),
      asset('hook-1', 'hook', {
        event: 'session_start',
        command: 'python D:/Code/berth/tools/hook_dispatch.py session_start'
      }, { name: 'Session start dispatcher' }),
      asset('mcp-1', 'mcp-server', {
        serverName: 'filesystem',
        description: 'stdio server for local files'
      }, { name: 'Filesystem MCP' }),
      asset('skill-1', 'skill', {
        description: 'Review pull requests with repository context'
      }, { name: 'Review Skill' })
    ]

    search.buildIndex(assets)

    expect(search.search('gpt-5', assets).map((result) => result.id)).toContain('session-1')
    expect(search.search('hook_dispatch', assets).map((result) => result.id)).toContain('hook-1')
    expect(search.search('stdio', assets).map((result) => result.id)).toContain('mcp-1')
    expect(search.search('repository context', assets).map((result) => result.id)).toContain('skill-1')
  })

  it('does not index raw asset content by default', () => {
    const search = new AssetSearch()
    const assets = [
      asset('secret-raw', 'skill', {}, {
        name: 'Visible skill',
        raw: 'xrayneedle'
      })
    ]

    search.buildIndex(assets)

    expect(search.search('xrayneedle', assets)).toEqual([])
  })

  it('refreshes the index when asset metadata changes', () => {
    const search = new AssetSearch()
    const first = [asset('session-1', 'session', { project: 'alpha' })]
    const second = [asset('session-1', 'session', { project: 'beta' })]

    search.ensureIndexed(first)
    expect(search.search('alpha', first).map((result) => result.id)).toEqual(['session-1'])

    search.ensureIndexed(second)
    expect(search.search('beta', second).map((result) => result.id)).toEqual(['session-1'])
    expect(search.search('alpha', second)).toEqual([])
  })

  it('skips reindexing across queries on the same asset array reference (GH-152 T2)', () => {
    // Dirty check is array-reference equality: the runtime rebuilds the assets
    // array immutably on every content change, so same ref ⟺ same content. The
    // old content-signature walked every asset's meta per NEW QUERY (O(all-text)
    // per keystroke) just to conclude "unchanged".
    const addAll = vi.spyOn(MiniSearch.prototype, 'addAll')
    try {
      const search = new AssetSearch()
      const assets = [asset('session-1', 'session', { project: 'alpha' })]

      expect(search.search('alpha', assets).map((r) => r.id)).toEqual(['session-1'])
      expect(search.search('session', assets).map((r) => r.id)).toEqual(['session-1'])

      expect(addAll).toHaveBeenCalledTimes(1) // second query reused the index
    } finally {
      addAll.mockRestore()
    }
  })

  it('reindexes on a new array reference — incremental fold under a stable snapshot id (GH-152 T2)', () => {
    // applyFileChange/applyPartial mutate assets under a STABLE snapshot id, so
    // the dirty key must not be snapshot.id — the freshly-folded asset has to be
    // searchable immediately.
    const search = new AssetSearch()
    const first = [asset('session-1', 'session', { project: 'alpha' })]
    search.ensureIndexed(first)

    const second = [...first, asset('session-2', 'session', { project: 'gamma' })]
    expect(search.search('gamma', second).map((r) => r.id)).toEqual(['session-2'])
  })

  it('dedupes duplicate asset ids without throwing — transient mid-scan snapshot (GH-140)', () => {
    const search = new AssetSearch()
    // Under SWR a derived read can hit the snapshot mid-rescan, where the live
    // asset list transiently carries the same id twice. MiniSearch.addAll throws
    // on duplicate ids; buildSearchDocs must dedupe (keep first) so search stays up.
    const assets = [
      asset('skill-dup', 'skill', { description: 'first occurrence' }, { name: 'Dup Skill' }),
      asset('skill-dup', 'skill', { description: 'second occurrence' }, { name: 'Dup Skill' }),
      asset('skill-unique', 'skill', { description: 'standalone entry' }, { name: 'Unique Skill' })
    ]

    expect(() => search.ensureIndexed(assets)).not.toThrow()
    expect(search.search('Dup Skill', assets).map((result) => result.id)).toContain('skill-dup')
    expect(search.search('standalone', assets).map((result) => result.id)).toContain('skill-unique')
  })
})
