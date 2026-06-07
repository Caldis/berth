import { describe, it, expect } from 'vitest'
import { assetMatchesAgentView, filterAssetsByAgentView } from '../../src/renderer/src/lib/agent-view'
import type { Asset } from '../../src/shared/types/asset'

// GH-113 T1: a merged AGENTS.md keeps a single primary agentId but records every
// agent that reads it in `meta.readByAgentIds`, so it must stay visible under
// every relevant agent view.

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: 'a',
    agentId: 'claude-code',
    category: 'instruction',
    type: 'agents-md',
    scope: 'project',
    name: 'AGENTS.md',
    path: 'D:\\proj\\AGENTS.md',
    meta: {},
    ...overrides
  }
}

describe('assetMatchesAgentView', () => {
  it('shows everything in the "all" view', () => {
    expect(assetMatchesAgentView(asset({ agentId: 'codex' }), 'all')).toBe(true)
  })

  it('shows a shared AGENTS.md in both claude and codex views via readByAgentIds', () => {
    const shared = asset({ agentId: 'claude-code', meta: { readByAgentIds: ['claude-code', 'codex'] } })
    expect(assetMatchesAgentView(shared, 'claude')).toBe(true)
    expect(assetMatchesAgentView(shared, 'codex')).toBe(true)
  })

  it('keeps a codex-only asset out of the claude view', () => {
    const codexOnly = asset({ agentId: 'codex', meta: { readByAgentIds: ['codex'] } })
    expect(assetMatchesAgentView(codexOnly, 'claude')).toBe(false)
    expect(assetMatchesAgentView(codexOnly, 'codex')).toBe(true)
  })

  it('keeps a claude-only asset out of the codex view', () => {
    const claudeOnly = asset({ agentId: 'claude-code', meta: { readByAgentIds: ['claude-code'] } })
    expect(assetMatchesAgentView(claudeOnly, 'codex')).toBe(false)
    expect(assetMatchesAgentView(claudeOnly, 'claude')).toBe(true)
  })

  it('falls back to agentId when readByAgentIds is absent', () => {
    expect(assetMatchesAgentView(asset({ agentId: 'codex', meta: {} }), 'codex')).toBe(true)
    expect(assetMatchesAgentView(asset({ agentId: 'codex', meta: {} }), 'claude')).toBe(false)
  })
})

describe('filterAssetsByAgentView', () => {
  it('keeps the shared AGENTS.md in the codex view but drops claude-only rows', () => {
    const shared = asset({ id: 'shared', meta: { readByAgentIds: ['claude-code', 'codex'] } })
    const claudeOnly = asset({ id: 'claude-only', meta: { readByAgentIds: ['claude-code'] } })
    const result = filterAssetsByAgentView([shared, claudeOnly], 'codex')
    expect(result.map((a) => a.id)).toEqual(['shared'])
  })
})
