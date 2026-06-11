import { describe, expect, it } from 'vitest'
import {
  extractAtImports,
  firstString,
  isRecord,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
  safeId,
  uniqueStrings
} from '@shared/object-guards'

// GH-115 T7: 单源后的行为锚 — 各模块副本收敛到此, 语义以这里为准。

describe('object-guards', () => {
  it('isRecord rejects null/arrays/primitives and accepts plain objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord([])).toBe(false)
    expect(isRecord('x')).toBe(false)
    expect(isRecord(42)).toBe(false)
  })

  it('readString returns trimmed-nonempty strings only, tolerating non-record inputs', () => {
    expect(readString({ k: 'v' }, 'k')).toBe('v')
    expect(readString({ k: '  ' }, 'k')).toBeUndefined()
    expect(readString({ k: 7 }, 'k')).toBeUndefined()
    expect(readString(null, 'k')).toBeUndefined()
  })

  it('readNumber accepts finite numbers only', () => {
    expect(readNumber({ k: 3 }, 'k')).toBe(3)
    expect(readNumber({ k: NaN }, 'k')).toBeUndefined()
    expect(readNumber({ k: '3' }, 'k')).toBeUndefined()
  })

  it('readBoolean accepts booleans only', () => {
    expect(readBoolean({ k: false }, 'k')).toBe(false)
    expect(readBoolean({ k: 0 }, 'k')).toBeUndefined()
  })

  it('readStringArray keeps non-empty strings only (handlers 语义: 过滤空白项)', () => {
    expect(readStringArray({ k: ['a', '', '  ', 'b', 7] }, 'k')).toEqual(['a', 'b'])
    expect(readStringArray({ k: 'not-array' }, 'k')).toEqual([])
    expect(readStringArray(undefined, 'k')).toEqual([])
  })

  it('firstString returns the first non-empty match', () => {
    expect(firstString({ a: '', b: 'hit', c: 'later' }, ['a', 'b', 'c'])).toBe('hit')
    expect(firstString({}, ['a'])).toBeUndefined()
  })

  it('uniqueStrings dedupes and drops blanks', () => {
    expect(uniqueStrings(['a', 'a', ' ', 'b'])).toEqual(['a', 'b'])
  })

  it('safeId slugs unsafe chars and never returns empty', () => {
    expect(safeId('Hello World!')).toBe('Hello-World')
    expect(safeId('///')).toBe('unknown')
    expect(safeId('x'.repeat(100))).toHaveLength(80)
  })

  it('extractAtImports pulls @path lines and ignores inline mentions', () => {
    const content = ['# Title', '@AGENTS.md', '@./docs/a.md', 'see @inline not-a-ref', '@ spaced'].join('\n')
    expect(extractAtImports(content)).toEqual(['AGENTS.md', './docs/a.md'])
  })
})
