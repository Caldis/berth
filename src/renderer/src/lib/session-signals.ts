import type { SessionDetailResult, SessionToolEvent } from '@shared/types/ipc'

// GH-144: session-detail 的核心会话信号聚合纯逻辑下沉到 lib, 可直测 (此前仅经组件
// 间接覆盖)。函数与类型保持与原内联完全一致 — 纯数据聚合, 无 React 依赖, 行为不变。

export interface SessionSignals {
  toolCount: number
  failedCount: number
  failedRate: number | null
  avgToolDurationMs: number | null
  slowestTool: { name: string; durationMs: number } | null
  tokenRatePerMinute: number | null
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionDetailResult['activityMetrics']['tokenRateSource']
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
  tokenRateTokenCount: number | null
  tokenRateSampleCount: number
  tokenRateIdleGapSeconds: number
  cacheReadShare: number | null
  costRatePerMinute: number | null
}

/** Tool duration in ms: prefer explicit durationMs, else derive from started/ended. */
export function getToolDurationMs(event: SessionToolEvent): number | null {
  if (typeof event.durationMs === 'number' && Number.isFinite(event.durationMs) && event.durationMs >= 0) {
    return event.durationMs
  }
  if (!event.startedAt || !event.endedAt) return null
  const start = new Date(event.startedAt).getTime()
  const end = new Date(event.endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  const duration = end - start
  return duration > 0 ? duration : null
}

/** Aggregate per-session signals (tool stats, failure rate, token/cache rates). */
export function buildSessionSignals(detail: SessionDetailResult): SessionSignals {
  const durations = detail.toolTimeline
    .map((event) => ({ event, durationMs: getToolDurationMs(event) }))
    .filter((entry): entry is { event: SessionToolEvent; durationMs: number } => entry.durationMs != null)
  const durationTotal = durations.reduce((sum, entry) => sum + entry.durationMs, 0)
  const slowest = durations.reduce<{ event: SessionToolEvent; durationMs: number } | null>(
    (max, entry) => (max == null || entry.durationMs > max.durationMs ? entry : max),
    null
  )
  const sessionMinutes = detail.summary.duration != null && detail.summary.duration > 0
    ? detail.summary.duration / 60
    : null
  const inputSideTokens =
    detail.summary.tokenUsage.inputTokens +
    detail.summary.tokenUsage.cacheReadInputTokens +
    detail.summary.tokenUsage.cacheCreationInputTokens
  const failedCount = detail.toolTimeline.filter((event) => event.status === 'error').length

  return {
    toolCount: detail.toolTimeline.length,
    failedCount,
    failedRate: detail.toolTimeline.length > 0 ? (failedCount / detail.toolTimeline.length) * 100 : null,
    avgToolDurationMs: durations.length > 0 ? durationTotal / durations.length : null,
    slowestTool: slowest ? { name: slowest.event.name, durationMs: slowest.durationMs } : null,
    tokenRatePerMinute: detail.activityMetrics.tokenRatePerMinute,
    tokenRateDurationSeconds: detail.activityMetrics.tokenRateDurationSeconds,
    tokenRateSource: detail.activityMetrics.tokenRateSource,
    tokenRateStartedAt: detail.activityMetrics.tokenRateStartedAt,
    tokenRateEndedAt: detail.activityMetrics.tokenRateEndedAt,
    tokenRateTokenCount: detail.activityMetrics.tokenRateTokenCount,
    tokenRateSampleCount: detail.activityMetrics.tokenRateSampleCount,
    tokenRateIdleGapSeconds: detail.activityMetrics.tokenRateIdleGapSeconds,
    cacheReadShare: inputSideTokens > 0
      ? (detail.summary.tokenUsage.cacheReadInputTokens / inputSideTokens) * 100
      : null,
    costRatePerMinute: detail.summary.cost == null || sessionMinutes == null
      ? null
      : detail.summary.cost / sessionMinutes
  }
}

/** Count of "notable" signals driving the overview tab badge. */
export function countSignalHighlights(signals: SessionSignals | null): number {
  if (!signals) return 0
  let count = 0
  if (signals.failedCount > 0) count += 1
  if (signals.slowestTool) count += 1
  if (signals.cacheReadShare != null && signals.cacheReadShare > 50) count += 1
  return count
}
