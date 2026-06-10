import type { SessionReplayEvent, SessionReplayEventKind } from '@shared/types/ipc'

// GH-116: 重放视图的纯逻辑层 — 过滤、时间偏移、scrubber 位置归一。
// 无 React 依赖, 直测于 tests/renderer/replay-model.test.ts。

export const REPLAY_KINDS: readonly SessionReplayEventKind[] = [
  'user',
  'assistant',
  'thinking',
  'tool',
  'result',
  'model',
  'system'
]

/** kinds 为 null 或空集 = 不过滤; query 同时匹配 summary 与 toolName (大小写不敏感)。 */
export function filterReplayEvents(
  events: readonly SessionReplayEvent[],
  kinds: ReadonlySet<SessionReplayEventKind> | null,
  query: string
): SessionReplayEvent[] {
  const hasKindFilter = kinds != null && kinds.size > 0
  const q = query.trim().toLowerCase()
  return events.filter((event) => {
    if (hasKindFilter && !kinds.has(event.kind)) return false
    if (!q) return true
    if (event.summary.toLowerCase().includes(q)) return true
    return event.toolName?.toLowerCase().includes(q) ?? false
  })
}

export function replayOffsetMs(timestamp: string | null, startMs: number | null): number | null {
  if (!timestamp || startMs == null) return null
  const ms = Date.parse(timestamp)
  if (Number.isNaN(ms)) return null
  return ms - startMs
}

/** 参考 Debug 视图的 h:mm:ss 形态 (小时不补零, 可超 24)。 */
export function formatReplayOffset(ms: number | null): string {
  if (ms == null) return '—'
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 每个事件在 scrubber 轨道上的归一化位置 (0..1)。
 * 有时间窗时按时间比例 (越界 clamp); 无时间戳的事件与无时间窗时回退索引比例。
 */
export function buildReplayPositions(
  events: readonly SessionReplayEvent[],
  startedAt: string | null,
  endedAt: string | null
): number[] {
  if (events.length === 0) return []
  if (events.length === 1) return [0]

  const startMs = startedAt ? Date.parse(startedAt) : NaN
  const endMs = endedAt ? Date.parse(endedAt) : NaN
  const span = endMs - startMs
  const byIndex = (index: number): number => index / (events.length - 1)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || span <= 0) {
    return events.map((_, index) => byIndex(index))
  }

  return events.map((event, index) => {
    if (!event.timestamp) return byIndex(index)
    const ms = Date.parse(event.timestamp)
    if (Number.isNaN(ms)) return byIndex(index)
    return Math.min(1, Math.max(0, (ms - startMs) / span))
  })
}

/** 轨道点击/拖拽位置 (0..1) → 最近事件索引; 空列表返回 -1。positions 单调不减。 */
export function nearestReplayIndex(positions: readonly number[], fraction: number): number {
  if (positions.length === 0) return -1
  let best = 0
  let bestDistance = Math.abs(positions[0] - fraction)
  for (let i = 1; i < positions.length; i++) {
    const distance = Math.abs(positions[i] - fraction)
    if (distance <= bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return best
}
