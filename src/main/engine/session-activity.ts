import type { Asset, SessionSummary } from '@shared/types/asset'
import type { SessionActivityMetrics } from '@shared/types/ipc'

export function toSessionActivityMetrics(
  _summary: Pick<SessionSummary, 'tokenUsage'>,
  _asset: Pick<Asset, 'meta'>
): SessionActivityMetrics {
  return {
    tokenRatePerMinute: null,
    tokenRateDurationSeconds: null,
    tokenRateSource: 'unavailable',
    tokenRateStartedAt: null,
    tokenRateEndedAt: null,
    tokenRateTokenCount: null,
    tokenRateSampleCount: 0,
    tokenRateIdleGapSeconds: 0
  }
}
