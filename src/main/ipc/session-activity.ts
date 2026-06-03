import type { Asset, SessionSummary } from '@shared/types/asset'
import type { SessionActivityMetrics } from '@shared/types/ipc'

export const MIN_TOKEN_RATE_DURATION_SECONDS = 60

export function toSessionActivityMetrics(
  summary: Pick<SessionSummary, 'tokenUsage'>,
  asset: Pick<Asset, 'meta'>
): SessionActivityMetrics {
  const startedAt = readString(asset.meta, 'usageStartedAt') ?? null
  const endedAt = readString(asset.meta, 'usageEndedAt') ?? null
  const durationSeconds =
    readNumber(asset.meta, 'usageDuration') ??
    calculateDurationSeconds(startedAt, endedAt)

  // Usage timestamps are log event times. Very short windows create misleading per-minute extrapolations.
  if (
    durationSeconds != null &&
    durationSeconds >= MIN_TOKEN_RATE_DURATION_SECONDS &&
    summary.tokenUsage.totalTokens > 0
  ) {
    return {
      tokenRatePerMinute: summary.tokenUsage.totalTokens / (durationSeconds / 60),
      tokenRateDurationSeconds: durationSeconds,
      tokenRateSource: 'usage-events',
      tokenRateStartedAt: startedAt,
      tokenRateEndedAt: endedAt
    }
  }

  return {
    tokenRatePerMinute: null,
    tokenRateDurationSeconds: durationSeconds,
    tokenRateSource: 'unavailable',
    tokenRateStartedAt: startedAt,
    tokenRateEndedAt: endedAt
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function calculateDurationSeconds(
  startedAt: string | null,
  endedAt: string | null
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(0, Math.round((end - start) / 1000))
}
