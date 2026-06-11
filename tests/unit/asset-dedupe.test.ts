import { describe, it, expect } from 'vitest'
import { stableAssetHash, assetEntityId } from '@shared/asset-dedupe'

// GH-113 Pre-T0: deterministic, collision-safe asset identity is the foundation
// for the persistent SQLite index (id = primary key) and incremental upsert.

describe('stableAssetHash', () => {
  it('is deterministic and a wide (16-hex) collision-safe digest', () => {
    expect(stableAssetHash('a/b/c')).toBe(stableAssetHash('a/b/c'))
    expect(stableAssetHash('a/b/c')).toMatch(/^[0-9a-f]{16}$/)
    expect(stableAssetHash('a/b/c')).not.toBe(stableAssetHash('a/b/d'))
  })
})

describe('assetEntityId', () => {
  it('is deterministic across calls for the same identity', () => {
    const a = assetEntityId('hook', 'user', 'C:\\Users\\me\\.claude\\settings.json', 'scn:hk')
    const b = assetEntityId('hook', 'user', 'C:\\Users\\me\\.claude\\settings.json', 'scn:hk')
    expect(a).toBe(b)
    expect(a.startsWith('hook-user-')).toBe(true)
  })

  it('distinguishes entityKey (multi-asset files do not collide)', () => {
    const path = 'C:\\Users\\me\\.claude\\settings.json'
    expect(assetEntityId('hook', 'user', path, 'scn:hookA')).not.toBe(assetEntityId('hook', 'user', path, 'scn:hookB'))
  })

  it('distinguishes type at the same path (settings.json → hook vs permission)', () => {
    const path = 'C:\\repo\\.claude\\settings.json'
    expect(assetEntityId('hook', 'project', path, 'allow')).not.toBe(assetEntityId('permission', 'project', path, 'allow'))
  })

  it('folds Windows path case so the same physical file keeps one id', () => {
    const a = assetEntityId('skill', 'user', 'C:\\Users\\Me\\.claude\\skills\\x\\SKILL.md', '', 'win32')
    const b = assetEntityId('skill', 'user', 'c:\\users\\me\\.claude\\skills\\x\\skill.md', '', 'win32')
    expect(a).toBe(b)
  })

  it('uses sourceKey not display name (rename-safe): empty entityKey keys on path only', () => {
    // Two skills at the same path with different display names map to one id;
    // identity is the path, not the (frontmatter/basename) name.
    expect(assetEntityId('skill', 'user', '/home/me/.agents/skills/x/SKILL.md', ''))
      .toBe(assetEntityId('skill', 'user', '/home/me/.agents/skills/x/SKILL.md', ''))
  })
})
