import { describe, expect, it } from 'vitest'
import { toSessionActivityMetrics } from '../../src/main/engine/session-activity'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

describe('toSessionActivityMetrics', () => {
  it('does not calculate a token consumption rate from local usage samples', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 42000 }) },
      {
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:05:00.000Z',
          usageDuration: 300
        }
      }
    )

    expect(metrics).toEqual({
      tokenRatePerMinute: null,
      tokenRateDurationSeconds: null,
      tokenRateSource: 'unavailable',
      tokenRateStartedAt: null,
      tokenRateEndedAt: null,
      tokenRateTokenCount: null,
      tokenRateSampleCount: 0,
      tokenRateIdleGapSeconds: 0
    })
  })
})
