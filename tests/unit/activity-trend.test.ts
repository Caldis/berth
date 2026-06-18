import { describe, expect, it } from 'vitest'
import { costTrend, cumulativeSeries, tokenTrend } from '@/lib/activity-trend'
import type { HeatmapDay } from '@shared/types/insights'

function days(tokens: number[]): HeatmapDay[] {
  return tokens.map((t, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, sessions: t > 0 ? 1 : 0, tokens: t }))
}

function costs(values: number[]): { date: string; cost: number }[] {
  return values.map((c, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, cost: c }))
}

describe('tokenTrend', () => {
  it('returns the last sparkDays of the daily token series', () => {
    const series = tokenTrend(days(Array.from({ length: 30 }, (_, i) => i + 1)), 7, 14).series
    expect(series).toHaveLength(14)
    expect(series[0]).toBe(17) // day 17 (30 - 14 + 1) value = index+1
    expect(series.at(-1)).toBe(30)
  })

  it('computes week-over-week token delta (recent 7 vs prior 7)', () => {
    // prior 7 = all 100 (700), recent 7 = all 110 (770) → +10%
    const trend = tokenTrend(days([...Array(7).fill(100), ...Array(7).fill(110)]), 7, 14)
    expect(Math.round(trend.deltaPct as number)).toBe(10)
  })

  it('reports a negative delta when usage drops', () => {
    const trend = tokenTrend(days([...Array(7).fill(200), ...Array(7).fill(100)]), 7, 14)
    expect(Math.round(trend.deltaPct as number)).toBe(-50)
  })

  it('returns null delta when there is no prior-window baseline', () => {
    expect(tokenTrend(days([1, 2, 3]), 7, 14).deltaPct).toBeNull()
    expect(tokenTrend([], 7, 14)).toEqual({ series: [], deltaPct: null })
  })
})

describe('costTrend', () => {
  it('returns the last sparkDays of the daily cost series', () => {
    const series = costTrend(costs(Array.from({ length: 30 }, (_, i) => i + 1)), 7, 14).series
    expect(series).toHaveLength(14)
    expect(series.at(-1)).toBe(30)
  })

  it('computes week-over-week cost delta (recent 7 vs prior 7)', () => {
    const trend = costTrend(costs([...Array(7).fill(10), ...Array(7).fill(11)]), 7, 14)
    expect(Math.round(trend.deltaPct as number)).toBe(10)
  })

  it('returns null delta when there is no prior-window baseline', () => {
    expect(costTrend(costs([1, 2, 3]), 7, 14).deltaPct).toBeNull()
    expect(costTrend([], 7, 14)).toEqual({ series: [], deltaPct: null })
  })
})

describe('cumulativeSeries', () => {
  it('accumulates tokens into a monotonic running total', () => {
    const series = cumulativeSeries(days([10, 20, 30]), 'tokens')
    expect(series.map((p) => p.value)).toEqual([10, 30, 60])
    expect(series[2].date).toBe('2026-01-03')
  })

  it('accumulates sessions (one per active day here)', () => {
    expect(cumulativeSeries(days([5, 0, 7, 7]), 'sessions').map((p) => p.value)).toEqual([1, 1, 2, 3])
  })

  it('returns [] for no days', () => {
    expect(cumulativeSeries([], 'tokens')).toEqual([])
  })
})
