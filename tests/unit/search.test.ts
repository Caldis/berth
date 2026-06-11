import { describe, expect, it } from 'vitest'
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
})
