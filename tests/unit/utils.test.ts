import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  formatCurrency,
  formatOptionalCurrency,
  formatOptionalDuration,
  formatOptionalRelativeTime,
  formatRelativeTime,
  truncatePath
} from '../../src/renderer/src/lib/utils'

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

  it('returns a placeholder for invalid dates', () => {
    expect(formatRelativeTime(new Date(''))).toBe('—')
    expect(formatOptionalRelativeTime(null)).toBe('—')
  })
})

describe('optional formatters', () => {
  it('does not turn unknown cost into zero dollars', () => {
    expect(formatOptionalCurrency(null)).toBe('—')
    expect(formatOptionalCurrency(0)).toBe('$0.00')
  })

  it('does not turn unknown duration into zero seconds', () => {
    expect(formatOptionalDuration(null)).toBe('—')
    expect(formatOptionalDuration(0)).toBe('0s')
    expect(formatOptionalDuration(125)).toBe('2m')
  })
})

describe('truncatePath', () => {
  it('returns short paths as-is', () => {
    expect(truncatePath('~/.claude/skills/')).toBe('~/.claude/skills/')
  })

  it('truncates long paths', () => {
    const longPath = '/Users/caldis/projects/some-very-long-project-name/.claude/skills/my-skill/SKILL.md'
    const result = truncatePath(longPath, 50)
    expect(result).toBe('/.../my-skill/SKILL.md')
  })

  it('keeps backslashes when truncating Windows paths', () => {
    const winPath = 'C:\\Users\\user\\.claude\\skills\\my-skill\\SKILL.md'
    const result = truncatePath(winPath, 30)
    expect(result).toBe('C:\\...\\my-skill\\SKILL.md')
    expect(result).not.toContain('/')
  })

  it('uses backslashes for Windows drive paths that arrive with forward slashes', () => {
    const winPath = 'D:/Code/berth/packages/berth-scan-engine/fixtures/e2e/project/CLAUDE.md'
    expect(truncatePath(winPath, 40)).toBe('D:\\...\\project\\CLAUDE.md')
  })

  it('keeps the UNC server and share when truncating network paths', () => {
    const uncPath = '\\\\server\\share\\deep\\folder\\file.md'
    expect(truncatePath(uncPath, 20)).toBe('\\\\server\\share\\...\\folder\\file.md')
  })
})
