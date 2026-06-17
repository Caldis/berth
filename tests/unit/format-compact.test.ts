import { describe, expect, it } from 'vitest'
import { formatCompactNumber } from '@/lib/utils'

describe('formatCompactNumber', () => {
  it('formats sub-thousand values as integers', () => {
    expect(formatCompactNumber(0)).toBe('0')
    expect(formatCompactNumber(42)).toBe('42')
    expect(formatCompactNumber(999)).toBe('999')
  })

  it('formats thousands with one decimal (K)', () => {
    expect(formatCompactNumber(1_000)).toBe('1.0K')
    expect(formatCompactNumber(12_300)).toBe('12.3K')
  })

  it('formats millions / billions / trillions with two decimals', () => {
    expect(formatCompactNumber(6_800_000)).toBe('6.80M')
    expect(formatCompactNumber(7_240_000_000)).toBe('7.24B')
    expect(formatCompactNumber(2_500_000_000_000)).toBe('2.50T')
  })

  it('handles negatives and non-finite input', () => {
    expect(formatCompactNumber(-1500)).toBe('-1.5K')
    expect(formatCompactNumber(Number.NaN)).toBe('0')
  })
})
