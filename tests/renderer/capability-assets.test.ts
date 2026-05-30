import { describe, expect, it } from 'vitest'
import type { Asset } from '../../src/shared/types/asset'
import { MASKED_ENV_VALUE, normalizeEnvVars, normalizePermissionRules } from '../../src/renderer/src/lib/capability-assets'

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: 'asset',
    agentId: 'claude-code',
    category: 'capability',
    type: 'permission',
    scope: 'project',
    name: 'asset',
    path: '/tmp/settings.json',
    meta: {},
    ...overrides
  }
}

describe('capability asset normalization', () => {
  it('expands current parser permission rules', () => {
    const rows = normalizePermissionRules([
      asset({
        id: 'allow',
        meta: { kind: 'allow', rules: ['Bash(pnpm test *)', 'Read(src/**)'] }
      })
    ])

    expect(rows).toEqual([
      expect.objectContaining({ id: 'allow:allow:0', kind: 'allow', rule: 'Bash(pnpm test *)' }),
      expect.objectContaining({ id: 'allow:allow:1', kind: 'allow', rule: 'Read(src/**)' })
    ])
  })

  it('keeps compatibility with single-pattern permission assets', () => {
    const rows = normalizePermissionRules([
      asset({
        id: 'deny',
        meta: { listType: 'deny', pattern: 'Bash(rm -rf /*)' }
      })
    ])

    expect(rows).toEqual([
      expect.objectContaining({ id: 'deny:deny:pattern', kind: 'deny', rule: 'Bash(rm -rf /*)' })
    ])
  })

  it('normalizes aggregate env assets into variable rows without exposing values', () => {
    const rows = normalizeEnvVars([
      asset({
        id: 'env',
        type: 'env',
        name: 'env',
        meta: { keys: ['ANTHROPIC_API_KEY', 'DEBUG'], count: 2 }
      })
    ])

    expect(rows).toEqual([
      expect.objectContaining({ id: 'env:ANTHROPIC_API_KEY', name: 'ANTHROPIC_API_KEY', value: MASKED_ENV_VALUE, sensitive: true }),
      expect.objectContaining({ id: 'env:DEBUG', name: 'DEBUG', value: MASKED_ENV_VALUE, sensitive: true })
    ])
  })

  it('shows non-sensitive single env values when they are present', () => {
    const rows = normalizeEnvVars([
      asset({
        id: 'debug',
        type: 'env',
        name: 'DEBUG',
        meta: { value: '1' },
        sensitive: false
      })
    ])

    expect(rows).toEqual([
      expect.objectContaining({ id: 'debug', name: 'DEBUG', value: '1', sensitive: false })
    ])
  })
})
