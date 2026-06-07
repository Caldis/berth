import { describe, expect, it } from 'vitest'
import { routeForAsset } from '../../src/renderer/src/lib/asset-route'
import type { AssetType } from '../../src/shared/types/asset'

// GH-112 S1: shared asset→page route map (extracted from the search dialog so
// both global search and plugin↔component jump use one source of truth).
describe('routeForAsset', () => {
  const cases: [AssetType, string][] = [
    ['skill', '/instructions/skills'],
    ['agent', '/instructions/subagents'],
    ['command', '/instructions/commands'],
    ['output-mode', '/instructions/output-modes'],
    ['claude-md', '/instructions/conventions'],
    ['agents-md', '/instructions/conventions'],
    ['mcp-server', '/capabilities/mcp'],
    ['hook', '/capabilities/hooks'],
    ['plugin', '/capabilities/plugins'],
    ['statusline', '/capabilities/status-line'],
    ['permission', '/capabilities/permissions'],
    ['env', '/capabilities/env'],
    ['usage-data', '/usage']
  ]

  it.each(cases)('maps %s → %s', (type, route) => {
    expect(routeForAsset({ type, id: 'x' })).toBe(route)
  })

  it('routes sessions to their detail page by id', () => {
    expect(routeForAsset({ type: 'session', id: 'sess-1' })).toBe('/sessions/sess-1')
  })

  it('falls back to overview for unmapped types', () => {
    expect(routeForAsset({ type: 'backup', id: 'x' })).toBe('/')
  })
})
