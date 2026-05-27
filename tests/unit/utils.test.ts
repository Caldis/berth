import { describe, it, expect } from 'vitest'
import { formatNumber, formatCurrency, formatRelativeTime, truncatePath } from '../../src/renderer/src/lib/utils'

describe('formatNumber', () => {
  it('formats small numbers as-is', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
    expect(formatNumber(999)).toBe('999')
  })

  it('formats thousands with k suffix', () => {
    expect(formatNumber(1000)).toBe('1.0k')
    expect(formatNumber(12400)).toBe('12.4k')
    expect(formatNumber(999999)).toBe('1000.0k')
  })

  it('formats millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M')
    expect(formatNumber(5240000)).toBe('5.2M')
  })
})

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats with two decimal places', () => {
    expect(formatCurrency(12.4)).toBe('$12.40')
    expect(formatCurrency(48.23)).toBe('$48.23')
    expect(formatCurrency(0.83)).toBe('$0.83')
  })
})

describe('formatRelativeTime', () => {
  it('formats just now', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('formats minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago')
  })

  it('formats hours ago', () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoHrsAgo)).toBe('2h ago')
  })

  it('formats days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
  })

  it('formats weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2w ago')
  })
})

describe('truncatePath', () => {
  it('returns short paths as-is', () => {
    expect(truncatePath('~/.claude/skills/')).toBe('~/.claude/skills/')
  })

  it('truncates long paths', () => {
    const longPath = '/Users/caldis/projects/some-very-long-project-name/.claude/skills/my-skill/SKILL.md'
    const result = truncatePath(longPath, 50)
    expect(result.length).toBeLessThanOrEqual(longPath.length)
    expect(result).toContain('...')
  })

  it('handles Windows paths', () => {
    const winPath = 'C:\\Users\\user\\.claude\\skills\\my-skill\\SKILL.md'
    const result = truncatePath(winPath, 30)
    expect(result).toContain('...')
  })
})
