import { describe, it, expect } from 'vitest'
import type { Asset, AssetCategory, AssetScope, Relation } from '@shared/types/asset'

describe('Asset type definitions', () => {
  it('can create a valid skill asset', () => {
    const asset: Asset = {
      id: 'skill-macos-tcc-helper',
      agentId: 'claude-code',
      category: 'instruction',
      type: 'skill',
      scope: 'user',
      name: 'macos-tcc-helper',
      path: '/Users/caldis/.claude/skills/macos-tcc-helper/',
      meta: {
        description: 'Validate macOS accessibility permissions',
        trigger: 'auto',
        tools: ['Bash', 'Read', 'Edit'],
        lineCount: 234
      }
    }
    expect(asset.category).toBe('instruction')
    expect(asset.sensitive).toBeUndefined()
  })

  it('can create a sensitive credential asset', () => {
    const asset: Asset = {
      id: 'credential-oauth',
      agentId: 'claude-code',
      category: 'integration',
      type: 'credential',
      scope: 'user',
      name: 'OAuth Credentials',
      path: '/Users/caldis/.claude/.credentials.json',
      meta: { hasToken: true },
      sensitive: true
    }
    expect(asset.sensitive).toBe(true)
    expect(asset.raw).toBeUndefined()
  })

  it('can create a relation', () => {
    const relation: Relation = {
      from: 'session-abc123',
      to: 'skill-macos-tcc-helper',
      kind: 'uses'
    }
    expect(relation.kind).toBe('uses')
  })

  it('validates all asset categories', () => {
    const categories: AssetCategory[] = [
      'instruction',
      'capability',
      'state',
      'observability',
      'integration'
    ]
    expect(categories).toHaveLength(5)
  })

  it('validates all asset scopes', () => {
    const scopes: AssetScope[] = ['user', 'project', 'enterprise', 'session']
    expect(scopes).toHaveLength(4)
  })
})
