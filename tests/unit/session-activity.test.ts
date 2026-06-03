import { describe, expect, it } from 'vitest'
import { toSessionActivityMetrics } from '../../src/main/ipc/session-activity'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

describe('toSessionActivityMetrics', () => {
  it('does not extrapolate a huge token rate from a very short usage window', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 11050 }) },
      {
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:00:01.000Z',
          usageDuration: 1
        }
      }
    )

    expect(metrics.tokenRatePerMinute).toBeNull()
    expect(metrics.tokenRateDurationSeconds).toBe(1)
    expect(metrics.tokenRateSource).toBe('unavailable')
  })

  it('keeps token rate available when the usage window is long enough', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 120 }) },
      {
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:01:00.000Z',
          usageDuration: 60
        }
      }
    )

    expect(metrics.tokenRatePerMinute).toBe(120)
    expect(metrics.tokenRateDurationSeconds).toBe(60)
    expect(metrics.tokenRateSource).toBe('usage-events')
  })

  it('does not report a token rate when no tokens were recorded', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 0 }) },
      {
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:02:00.000Z',
          usageDuration: 120
        }
      }
    )

    expect(metrics.tokenRatePerMinute).toBeNull()
    expect(metrics.tokenRateDurationSeconds).toBe(120)
    expect(metrics.tokenRateSource).toBe('unavailable')
  })
})
