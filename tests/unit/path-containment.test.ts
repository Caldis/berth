import { describe, expect, it } from 'vitest'
import { isPathInside } from '@shared/path-utils'

// GH-115 T7: 收敛此前互相矛盾的 4 套 2 算法包含判定 (memory ×2 / engine/scanner)。
// 语义锚: 平台感知大小写折叠与 samePath 一致; equal 是否算 inside 由调用方显式声明。

describe('isPathInside', () => {
  it('detects containment with a separator boundary (/foo vs /foobar)', () => {
    expect(isPathInside('/a/b/c.txt', '/a/b', { platform: 'linux' })).toBe(true)
    expect(isPathInside('/a/bcd/e.txt', '/a/b', { platform: 'linux' })).toBe(false)
  })

  it('treats equality per the includeEqual knob (memory 语义 true / scanner 旧语义 false)', () => {
    expect(isPathInside('/a/b', '/a/b', { platform: 'linux' })).toBe(false)
    expect(isPathInside('/a/b', '/a/b', { platform: 'linux', includeEqual: true })).toBe(true)
  })

  it('folds case on win32 only (与 samePath 同一平台语义; POSIX 形状路径以便跨平台跑)', () => {
    expect(isPathInside('/Code/App/x.ts', '/code', { platform: 'win32' })).toBe(true)
    expect(isPathInside('/A/B/x', '/a/b', { platform: 'linux' })).toBe(false)
  })

  it('rejects undefined sides', () => {
    expect(isPathInside(undefined, '/a')).toBe(false)
    expect(isPathInside('/a', undefined)).toBe(false)
  })
})
