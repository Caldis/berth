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

// ── GH-120: canvas 时间轴的视口/聚合数学层 (纯函数, 组件只做绘制与事件接线) ──

export interface TimelineViewport {
  /** 视口左缘绝对时间 (ms epoch)。 */
  startMs: number
  /** 视口右缘绝对时间 (ms epoch)。 */
  endMs: number
}

export interface TimelineBounds {
  minMs: number
  maxMs: number
}

/** 相邻事件超过该间隔即视为"长时间等待" (60s, 经验默认; 调用处可参数化)。 */
export const REPLAY_WAIT_THRESHOLD_MS = 60_000

/** 缩放下限: 视口最小时间跨度。 */
export const REPLAY_MIN_SPAN_MS = 1_000

/** kind → 语义泳道: 0=Conversation (user/assistant/thinking), 1=Tools (tool/result), 2=Meta (model/system)。 */
export const REPLAY_LANES: Record<SessionReplayEventKind, 0 | 1 | 2> = {
  user: 0,
  assistant: 0,
  thinking: 0,
  tool: 1,
  result: 1,
  model: 2,
  system: 2
}

export const REPLAY_LANE_COUNT = 3

/**
 * 事件绝对时间 (ms) 与会话边界。bounds 含两侧 1% padding (最少 500ms),
 * 并外扩覆盖窗口外的事件时间; 全部事件无可解析时间戳时 bounds 为 null
 * (时间轴退化为不可用, 由组件降级处理)。
 */
export function buildReplayTimePoints(
  events: readonly SessionReplayEvent[],
  startedAt: string | null,
  endedAt: string | null
): { bounds: TimelineBounds | null; times: (number | null)[] } {
  const times = events.map((event) => {
    if (!event.timestamp) return null
    const ms = Date.parse(event.timestamp)
    return Number.isNaN(ms) ? null : ms
  })

  let min = startedAt ? Date.parse(startedAt) : NaN
  let max = endedAt ? Date.parse(endedAt) : NaN
  if (Number.isNaN(min)) min = Infinity
  if (Number.isNaN(max)) max = -Infinity
  for (const ms of times) {
    if (ms == null) continue
    if (ms < min) min = ms
    if (ms > max) max = ms
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { bounds: null, times }

  const padding = Math.max((max - min) * 0.01, 500)
  return { bounds: { minMs: min - padding, maxMs: max + padding }, times }
}

export function timeToX(ms: number, viewport: TimelineViewport, width: number): number {
  const span = viewport.endMs - viewport.startMs
  if (span <= 0) return 0
  return ((ms - viewport.startMs) / span) * width
}

export function xToTime(x: number, viewport: TimelineViewport, width: number): number {
  if (width <= 0) return viewport.startMs
  return viewport.startMs + (x / width) * (viewport.endMs - viewport.startMs)
}

function clampViewport(
  startMs: number,
  spanMs: number,
  bounds: TimelineBounds
): TimelineViewport {
  const maxSpan = bounds.maxMs - bounds.minMs
  const span = Math.min(spanMs, maxSpan)
  let start = startMs
  if (start < bounds.minMs) start = bounds.minMs
  if (start + span > bounds.maxMs) start = bounds.maxMs - span
  return { startMs: start, endMs: start + span }
}

/** 锚点缩放: anchorMs 的视口内比例位置保持不变。factor <1 放大 (跨度变小), >1 缩小。 */
export function zoomViewportAt(
  viewport: TimelineViewport,
  anchorMs: number,
  factor: number,
  bounds: TimelineBounds,
  minSpanMs: number = REPLAY_MIN_SPAN_MS
): TimelineViewport {
  const span = viewport.endMs - viewport.startMs
  const maxSpan = bounds.maxMs - bounds.minMs
  const newSpan = Math.min(Math.max(span * factor, minSpanMs), maxSpan)
  const anchorFraction = span > 0 ? (anchorMs - viewport.startMs) / span : 0
  return clampViewport(anchorMs - anchorFraction * newSpan, newSpan, bounds)
}

export function panViewportBy(
  viewport: TimelineViewport,
  deltaMs: number,
  bounds: TimelineBounds
): TimelineViewport {
  return clampViewport(viewport.startMs + deltaMs, viewport.endMs - viewport.startMs, bounds)
}

/** 时间点 → 容差内最近事件索引 (跳过无时间戳事件); 无命中返回 -1。 */
export function nearestTimeIndex(
  times: readonly (number | null)[],
  ms: number,
  toleranceMs: number
): number {
  let best = -1
  let bestDistance = Infinity
  for (let i = 0; i < times.length; i++) {
    const t = times[i]
    if (t == null) continue
    const distance = Math.abs(t - ms)
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return bestDistance <= toleranceMs ? best : -1
}

const TICK_STEPS_MS = [
  100, 250, 500, 1_000, 2_000, 5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 900_000,
  1_800_000, 3_600_000, 7_200_000, 21_600_000, 43_200_000, 86_400_000
]

/** 可见跨度 → 可读刻度步长 (目标 ≤ targetTicks 条)。 */
export function selectTickStep(spanMs: number, targetTicks = 6): number {
  for (const step of TICK_STEPS_MS) {
    if (spanMs / step <= targetTicks) return step
  }
  let step = TICK_STEPS_MS[TICK_STEPS_MS.length - 1]
  while (spanMs / step > targetTicks) step *= 2
  return step
}

export interface ReplayWaitGap {
  startMs: number
  endMs: number
  /** gap 起点对应的事件索引 (gap 在该事件之后)。 */
  afterIndex: number
}

/** 相邻有时间戳事件之间超阈值的等待区段 (跳过 null, 忽略时间回退)。 */
export function computeWaitGaps(
  times: readonly (number | null)[],
  thresholdMs: number = REPLAY_WAIT_THRESHOLD_MS
): ReplayWaitGap[] {
  const gaps: ReplayWaitGap[] = []
  let prevIndex = -1
  for (let i = 0; i < times.length; i++) {
    if (times[i] == null) continue
    if (prevIndex >= 0) {
      const prev = times[prevIndex] as number
      const current = times[i] as number
      if (current - prev > thresholdMs) {
        gaps.push({ startMs: prev, endMs: current, afterIndex: prevIndex })
      }
    }
    prevIndex = i
  }
  return gaps
}

export interface ReplayBucket {
  lane: 0 | 1 | 2
  /** 视口内整数像素列。 */
  x: number
  /** 聚合的事件数 (绘制时转高度增量)。 */
  count: number
  /** 首事件 kind (取色; error 时绘制层改用 danger)。 */
  kind: SessionReplayEventKind
  /** bucket 内是否含失败 tool/result。 */
  error: boolean
  /** bucket 首事件在过滤列表中的索引 (点击拾取)。 */
  firstIndex: number
}

/** 视口内事件按 (lane, 像素列) 聚合; 无时间戳与视口外事件跳过。 */
export function bucketReplayEvents(
  events: readonly SessionReplayEvent[],
  times: readonly (number | null)[],
  viewport: TimelineViewport,
  width: number
): ReplayBucket[] {
  const byKey = new Map<number, ReplayBucket>()
  for (let i = 0; i < events.length; i++) {
    const t = times[i]
    if (t == null || t < viewport.startMs || t > viewport.endMs) continue
    const x = Math.floor(timeToX(t, viewport, width))
    if (x < 0 || x > width) continue
    const event = events[i]
    const lane = REPLAY_LANES[event.kind]
    const error = (event.kind === 'tool' || event.kind === 'result') && event.status === 'error'
    const key = lane * (width + 1) + x
    const bucket = byKey.get(key)
    if (bucket) {
      bucket.count += 1
      bucket.error = bucket.error || error
    } else {
      byKey.set(key, { lane, x, count: 1, kind: event.kind, error, firstIndex: i })
    }
  }
  return [...byKey.values()]
}
