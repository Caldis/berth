import { describe, expect, it } from 'vitest'
import { toSessionActivityMetrics } from '../../src/main/ipc/session-activity'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

describe('toSessionActivityMetrics', () => {
  it('does not extrapolate a huge token rate from a very short usage window', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 11050 }) },
      {
        agentId: 'claude-code',
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:00:01.000Z',
          usageDuration: 1
        },
        raw: [
          claudeUsageLine('2026-06-04T01:00:00.000Z', 6000),
          claudeUsageLine('2026-06-04T01:00:01.000Z', 5050)
        ].join('\n')
      }
    )

    expect(metrics.tokenRatePerMinute).toBeNull()
    expect(metrics.tokenRateDurationSeconds).toBe(1)
    expect(metrics.tokenRateSource).toBe('unavailable')
    expect(metrics.tokenRateTokenCount).toBe(11050)
    expect(metrics.tokenRateSampleCount).toBe(2)
  })

  it('keeps token rate available when the usage window is long enough', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 120 }) },
      {
        agentId: 'claude-code',
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:01:00.000Z',
          usageDuration: 60
        },
        raw: [
          claudeUsageLine('2026-06-04T01:00:00.000Z', 50),
          claudeUsageLine('2026-06-04T01:01:00.000Z', 70)
        ].join('\n')
      }
    )

    expect(metrics.tokenRatePerMinute).toBe(120)
    expect(metrics.tokenRateDurationSeconds).toBe(60)
    expect(metrics.tokenRateSource).toBe('activity-window')
    expect(metrics.tokenRateTokenCount).toBe(120)
    expect(metrics.tokenRateSampleCount).toBe(2)
    expect(metrics.tokenRateIdleGapSeconds).toBe(1800)
  })

  it('does not report a token rate when no tokens were recorded', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 0 }) },
      {
        agentId: 'claude-code',
        meta: {
          usageStartedAt: '2026-06-04T01:00:00.000Z',
          usageEndedAt: '2026-06-04T01:02:00.000Z',
          usageDuration: 120
        },
        raw: ''
      }
    )

    expect(metrics.tokenRatePerMinute).toBeNull()
    expect(metrics.tokenRateDurationSeconds).toBeNull()
    expect(metrics.tokenRateSource).toBe('unavailable')
    expect(metrics.tokenRateTokenCount).toBeNull()
    expect(metrics.tokenRateSampleCount).toBe(0)
  })

  it('uses only the latest activity window for long-running Codex sessions', () => {
    const metrics = toSessionActivityMetrics(
      { tokenUsage: normalizeTokenUsage({ totalTokens: 42000 }) },
      {
        agentId: 'codex',
        meta: {},
        raw: [
          codexCumulativeTokenLine('2026-06-04T02:00:00.000Z', 20000),
          codexCumulativeTokenLine('2026-06-04T02:10:00.000Z', 30000),
          codexCumulativeTokenLine('2026-06-05T01:00:00.000Z', 35000),
          codexCumulativeTokenLine('2026-06-05T01:05:00.000Z', 42000)
        ].join('\n')
      }
    )

    expect(metrics.tokenRatePerMinute).toBe(1400)
    expect(metrics.tokenRateDurationSeconds).toBe(300)
    expect(metrics.tokenRateSource).toBe('activity-window')
    expect(metrics.tokenRateStartedAt).toBe('2026-06-05T01:00:00.000Z')
    expect(metrics.tokenRateEndedAt).toBe('2026-06-05T01:05:00.000Z')
    expect(metrics.tokenRateTokenCount).toBe(7000)
    expect(metrics.tokenRateSampleCount).toBe(2)
  })
})

function claudeUsageLine(timestamp: string, totalTokens: number): string {
  return JSON.stringify({
    timestamp,
    message: {
      usage: {
        total_tokens: totalTokens
      }
    }
  })
}

function codexCumulativeTokenLine(timestamp: string, totalTokens: number): string {
  return JSON.stringify({
    timestamp,
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        total_token_usage: {
          total_tokens: totalTokens
        }
      }
    }
  })
}
