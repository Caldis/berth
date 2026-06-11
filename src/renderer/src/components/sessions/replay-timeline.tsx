import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionReplayEvent, SessionReplayEventKind } from '@shared/types/ipc'
import { cn } from '@/lib/utils'
import { replayKindColorClasses } from './replay-kind-chip'
import {
  REPLAY_LANES,
  REPLAY_LANE_COUNT,
  bucketReplayEvents,
  nearestTimeIndex,
  panViewportBy,
  selectTickStep,
  timeToX,
  xToTime,
  zoomViewportAt,
  type ReplayWaitGap,
  type TimelineBounds,
  type TimelineViewport
} from '@/lib/replay-model'

// GH-120 AC3-6: canvas 时间轴 — DevTools Performance 范式。
// 三泳道 (Conversation/Tools/Meta) + 刻度尺; 滚轮锚点缩放, 拖曳平移,
// window 矩形双向同步列表视口, 等待带 + 中断线 + 选中框选。
// 数学层全部在 lib/replay-model (直测); 本组件只做绘制与事件接线。
// jsdom 下 getContext 返回 null — 绘制跳过, DOM 语义层 (slider aria/键盘) 可测。

const RULER_H = 16
const TOP_GAP = 4
const LANE_H = 12
const LANE_GAP = 2
const EVENT_W = 2
const CLICK_TOLERANCE_PX = 5
const DRAG_THRESHOLD_PX = 3
const WHEEL_ZOOM_BASE = 1.0015

interface VisibleRange {
  startIndex: number
  endIndex: number
}

interface ReplayTimelineProps {
  /** 过滤后的事件列表 (与 times 一一对应)。 */
  events: readonly SessionReplayEvent[]
  times: readonly (number | null)[]
  /** null = 无可用时间数据, 时间轴退化为禁用态。 */
  bounds: TimelineBounds | null
  waitGaps: readonly ReplayWaitGap[]
  selectedIndex: number
  /** 底部列表当前可见范围 (window 矩形); null = 不画。 */
  visibleRange: VisibleRange | null
  onSelect: (index: number) => void
  /** 拖动 window 矩形 → 期望的列表视口起始时间。 */
  onWindowDrag?: (startMs: number) => void
  ariaLabel: string
  ariaValueText?: string
  className?: string
}

interface TimelineColors {
  kind: Record<SessionReplayEventKind, string>
  rulerText: string
  grid: string
  wait: string
  waitEdge: string
  waitText: string
  interrupt: string
  danger: string
  window: string
  windowBorder: string
  selection: string
  selectionSoft: string
}

function readColors(): TimelineColors {
  const style = getComputedStyle(document.documentElement)
  const raw = (name: string): string => style.getPropertyValue(name).trim()
  const hsl = (name: string, alpha?: number): string =>
    alpha != null ? `hsl(${raw(name)} / ${alpha})` : `hsl(${raw(name)})`
  return {
    kind: {
      user: hsl('--replay-user'),
      assistant: hsl('--replay-assistant'),
      thinking: hsl('--replay-thinking'),
      tool: hsl('--replay-tool'),
      result: hsl('--replay-result'),
      model: hsl('--replay-model'),
      system: hsl('--replay-system')
    },
    rulerText: hsl('--muted-foreground', 0.85),
    grid: hsl('--border', 0.6),
    wait: hsl('--muted-foreground', 0.08),
    waitEdge: hsl('--muted-foreground', 0.3),
    waitText: hsl('--muted-foreground', 0.9),
    interrupt: hsl('--destructive'),
    danger: hsl('--destructive'),
    window: hsl('--primary', 0.07),
    windowBorder: hsl('--primary', 0.4),
    selection: hsl('--primary'),
    selectionSoft: hsl('--primary', 0.25)
  }
}

function laneTop(lane: number): number {
  return RULER_H + TOP_GAP + lane * (LANE_H + LANE_GAP)
}

function lanesBottom(): number {
  return laneTop(REPLAY_LANE_COUNT - 1) + LANE_H
}

/** 等待带标签: "45s" / "1m 23s" / "2h 5m"。 */
function formatGapDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

/** 刻度标签: 会话相对偏移 h:mm:ss (短跨度去掉小时位)。 */
function formatTickLabel(ms: number, originMs: number, spanMs: number): string {
  const offset = Math.max(0, Math.round((ms - originMs) / 1000))
  const hours = Math.floor(offset / 3600)
  const minutes = Math.floor((offset % 3600) / 60)
  const seconds = offset % 60
  if (spanMs < 3_600_000 && hours === 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

type PointerMode =
  | { type: 'idle' }
  | { type: 'pending'; startX: number; mode: 'pan' | 'window'; grabOffsetMs: number }
  | { type: 'pan'; lastX: number }
  | { type: 'window'; grabOffsetMs: number }

export function ReplayTimeline({
  events,
  times,
  bounds,
  waitGaps,
  selectedIndex,
  visibleRange,
  onSelect,
  onWindowDrag,
  ariaLabel,
  ariaValueText,
  className
}: ReplayTimelineProps): React.ReactElement {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 视口与绘制状态走 ref — 拖曳/缩放每帧变化, 不进 React state 避免重渲染。
  const viewportRef = useRef<TimelineViewport | null>(null)
  const userZoomedRef = useRef(false)
  const sizeRef = useRef({ width: 0, height: 0 })
  const colorsRef = useRef<TimelineColors | null>(null)
  const pointerRef = useRef<PointerMode>({ type: 'idle' })
  const dirtyRef = useRef(true)
  const rafRef = useRef(0)
  const [hoverIndex, setHoverIndex] = useState(-1)
  const hoverRef = useRef(-1)

  const propsRef = useRef({ events, times, bounds, waitGaps, selectedIndex, visibleRange })
  propsRef.current = { events, times, bounds, waitGaps, selectedIndex, visibleRange }

  const currentViewport = useCallback((): TimelineViewport | null => {
    const b = propsRef.current.bounds
    if (!b) return null
    const vp = viewportRef.current
    if (!vp || !userZoomedRef.current) return { startMs: b.minMs, endMs: b.maxMs }
    // bounds 变化 (筛选/数据更新) 后 clamp 既有视口
    return panViewportBy(vp, 0, b)
  }, [])

  const draw = useCallback((): void => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = sizeRef.current
    if (width <= 0 || height <= 0) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const { events, times, bounds, waitGaps, selectedIndex, visibleRange } = propsRef.current
    const vp = currentViewport()
    if (!bounds || !vp) return
    const colors = colorsRef.current ?? (colorsRef.current = readColors())
    const span = vp.endMs - vp.startMs
    if (span <= 0) return

    // ── 等待带 (泳道区背景层) ──
    const lanesTop = RULER_H + TOP_GAP
    const lanesH = lanesBottom() - lanesTop
    for (const gap of waitGaps) {
      const x1 = timeToX(gap.startMs, vp, width)
      const x2 = timeToX(gap.endMs, vp, width)
      if (x2 < 0 || x1 > width) continue
      const left = Math.max(0, x1)
      const w = Math.min(width, x2) - left
      if (w < 1) continue
      ctx.fillStyle = colors.wait
      ctx.fillRect(left, lanesTop, w, lanesH)
      ctx.strokeStyle = colors.waitEdge
      ctx.setLineDash([2, 3])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(left, lanesTop + 0.5)
      ctx.lineTo(left + w, lanesTop + 0.5)
      ctx.moveTo(left, lanesBottom() - 0.5)
      ctx.lineTo(left + w, lanesBottom() - 0.5)
      ctx.stroke()
      ctx.setLineDash([])
      if (w > 44) {
        ctx.fillStyle = colors.waitText
        ctx.font = '9px ui-sans-serif, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(formatGapDuration(gap.endMs - gap.startMs), left + w / 2, lanesTop + lanesH / 2)
      }
    }

    // ── 刻度尺 + 网格 ──
    const step = selectTickStep(span)
    const firstTick = Math.ceil(vp.startMs / step) * step
    ctx.font = '9px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (let tick = firstTick; tick <= vp.endMs; tick += step) {
      const x = timeToX(tick, vp, width)
      ctx.strokeStyle = colors.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.round(x) + 0.5, RULER_H - 4)
      ctx.lineTo(Math.round(x) + 0.5, height)
      ctx.stroke()
      ctx.fillStyle = colors.rulerText
      ctx.fillText(formatTickLabel(tick, bounds.minMs, span), x + 3, 2)
    }

    // ── window 矩形 (列表视口) 填充层 ──
    let windowRect: { x: number; w: number } | null = null
    if (visibleRange && events.length > 0) {
      let startMs: number | null = null
      let endMs: number | null = null
      for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < times.length; i++) {
        const t = times[i]
        if (t != null) {
          if (startMs == null) startMs = t
          endMs = t
        }
      }
      if (startMs != null && endMs != null) {
        let x1 = timeToX(startMs, vp, width)
        let x2 = timeToX(endMs, vp, width)
        if (x2 - x1 < 6) {
          const mid = (x1 + x2) / 2
          x1 = mid - 3
          x2 = mid + 3
        }
        windowRect = { x: x1, w: x2 - x1 }
        ctx.fillStyle = colors.window
        ctx.fillRect(x1, 0, x2 - x1, height)
      }
    }

    // ── 事件块 (三泳道, 像素聚合) ──
    const buckets = bucketReplayEvents(events, times, vp, width)
    const hovered = hoverRef.current
    for (const bucket of buckets) {
      const color = bucket.error ? colors.danger : colors.kind[bucket.kind]
      const h = Math.min(LANE_H, 7 + Math.min(bucket.count - 1, 4))
      const y = laneTop(bucket.lane) + (LANE_H - h) / 2
      ctx.fillStyle = color
      ctx.globalAlpha = hovered >= 0 && bucket.firstIndex === hovered ? 1 : 0.9
      ctx.fillRect(bucket.x, y, EVENT_W, h)
      ctx.globalAlpha = 1
    }

    // ── 中断线 (destructive 贯穿泳道区 + 顶旗) ──
    for (let i = 0; i < events.length; i++) {
      if (!events[i].interrupted) continue
      const tMs = times[i]
      if (tMs == null || tMs < vp.startMs || tMs > vp.endMs) continue
      const x = Math.round(timeToX(tMs, vp, width)) + 0.5
      ctx.strokeStyle = colors.interrupt
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, lanesTop - 2)
      ctx.lineTo(x, lanesBottom() + 2)
      ctx.stroke()
      ctx.fillStyle = colors.interrupt
      ctx.beginPath()
      ctx.moveTo(x - 3.5, lanesTop - 2)
      ctx.lineTo(x + 3.5, lanesTop - 2)
      ctx.lineTo(x, lanesTop + 3)
      ctx.closePath()
      ctx.fill()
    }

    // ── 选中框选高亮 ──
    if (selectedIndex >= 0 && selectedIndex < events.length) {
      const tMs = times[selectedIndex]
      if (tMs != null && tMs >= vp.startMs && tMs <= vp.endMs) {
        const x = timeToX(tMs, vp, width)
        const lane = REPLAY_LANES[events[selectedIndex].kind]
        ctx.strokeStyle = colors.selectionSoft
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(Math.round(x) + 0.5, lanesTop - 2)
        ctx.lineTo(Math.round(x) + 0.5, lanesBottom() + 2)
        ctx.stroke()
        ctx.strokeStyle = colors.selection
        ctx.lineWidth = 1.5
        ctx.strokeRect(Math.round(x - 3) + 0.5, laneTop(lane) - 2.5, EVENT_W + 6, LANE_H + 5)
      }
    }

    // ── window 边框 (顶层) ──
    if (windowRect) {
      ctx.strokeStyle = colors.windowBorder
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(windowRect.x) + 0.5, 0.5, Math.round(windowRect.w), height - 1)
    }
  }, [currentViewport])

  const markDirty = useCallback((): void => {
    dirtyRef.current = true
    if (rafRef.current) return
    if (typeof requestAnimationFrame !== 'function') {
      dirtyRef.current = false
      draw()
      return
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      if (dirtyRef.current) {
        dirtyRef.current = false
        draw()
      }
    })
  }, [draw])

  // props 变化重绘
  useEffect(() => {
    markDirty()
  }, [events, times, bounds, waitGaps, selectedIndex, visibleRange, hoverIndex, markDirty])

  // 尺寸跟踪
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const update = (): void => {
      const rect = host.getBoundingClientRect()
      sizeRef.current = { width: rect.width, height: rect.height }
      markDirty()
    }
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [markDirty])

  // 主题/accent 切换重取色
  useEffect(() => {
    colorsRef.current = readColors()
    if (typeof MutationObserver === 'undefined') return undefined
    const observer = new MutationObserver(() => {
      colorsRef.current = readColors()
      markDirty()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] })
    return () => observer.disconnect()
  }, [markDirty])

  useEffect(() => () => {
    if (rafRef.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafRef.current)
  }, [])

  // wheel 缩放必须 non-passive 才能 preventDefault (React onWheel 不行)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const onWheel = (e: WheelEvent): void => {
      const { bounds } = propsRef.current
      const vp = currentViewport()
      if (!bounds || !vp) return
      e.preventDefault()
      const rect = host.getBoundingClientRect()
      const width = rect.width || 1
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const delta = (e.deltaX || e.deltaY) / width
        viewportRef.current = panViewportBy(vp, delta * (vp.endMs - vp.startMs), bounds)
      } else {
        const anchorMs = xToTime(e.clientX - rect.left, vp, width)
        viewportRef.current = zoomViewportAt(vp, anchorMs, Math.pow(WHEEL_ZOOM_BASE, e.deltaY), bounds)
      }
      userZoomedRef.current = true
      markDirty()
    }
    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [currentViewport, markDirty])

  const eventAtClientX = useCallback(
    (clientX: number): number => {
      const host = hostRef.current
      const vp = currentViewport()
      if (!host || !vp) return -1
      const rect = host.getBoundingClientRect()
      const width = rect.width || 1
      const ms = xToTime(clientX - rect.left, vp, width)
      const tolerance = ((vp.endMs - vp.startMs) / width) * CLICK_TOLERANCE_PX
      return nearestTimeIndex(propsRef.current.times, ms, tolerance)
    },
    [currentViewport]
  )

  const windowSpanAtPointer = useCallback(
    (clientX: number): { inside: boolean; grabOffsetMs: number } => {
      const host = hostRef.current
      const vp = currentViewport()
      const { times, visibleRange } = propsRef.current
      if (!host || !vp || !visibleRange) return { inside: false, grabOffsetMs: 0 }
      let startMs: number | null = null
      let endMs: number | null = null
      for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < times.length; i++) {
        const t = times[i]
        if (t != null) {
          if (startMs == null) startMs = t
          endMs = t
        }
      }
      if (startMs == null || endMs == null) return { inside: false, grabOffsetMs: 0 }
      const rect = host.getBoundingClientRect()
      const pointerMs = xToTime(clientX - rect.left, vp, rect.width || 1)
      return { inside: pointerMs >= startMs && pointerMs <= endMs, grabOffsetMs: pointerMs - startMs }
    },
    [currentViewport]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!propsRef.current.bounds) return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const win = windowSpanAtPointer(e.clientX)
      pointerRef.current = {
        type: 'pending',
        startX: e.clientX,
        mode: win.inside ? 'window' : 'pan',
        grabOffsetMs: win.grabOffsetMs
      }
    },
    [windowSpanAtPointer]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      const host = hostRef.current
      const vp = currentViewport()
      if (!host || !vp) return
      const state = pointerRef.current
      const rect = host.getBoundingClientRect()
      const width = rect.width || 1

      if (state.type === 'idle') {
        const index = eventAtClientX(e.clientX)
        if (index !== hoverRef.current) {
          hoverRef.current = index
          setHoverIndex(index)
        }
        host.style.cursor = index >= 0 ? 'pointer' : 'grab'
        return
      }

      if (state.type === 'pending') {
        if (Math.abs(e.clientX - state.startX) <= DRAG_THRESHOLD_PX) return
        pointerRef.current =
          state.mode === 'window'
            ? { type: 'window', grabOffsetMs: state.grabOffsetMs }
            : { type: 'pan', lastX: e.clientX }
        host.style.cursor = 'grabbing'
      }

      const active = pointerRef.current
      if (active.type === 'pan') {
        const { bounds } = propsRef.current
        if (!bounds) return
        const deltaMs = ((active.lastX - e.clientX) / width) * (vp.endMs - vp.startMs)
        viewportRef.current = panViewportBy(vp, deltaMs, bounds)
        userZoomedRef.current = true
        pointerRef.current = { type: 'pan', lastX: e.clientX }
        markDirty()
      } else if (active.type === 'window') {
        const pointerMs = xToTime(e.clientX - rect.left, vp, width)
        onWindowDrag?.(pointerMs - active.grabOffsetMs)
      }
    },
    [currentViewport, eventAtClientX, markDirty, onWindowDrag]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      const state = pointerRef.current
      pointerRef.current = { type: 'idle' }
      const host = hostRef.current
      if (host) host.style.cursor = 'grab'
      if (state.type === 'pending') {
        const index = eventAtClientX(e.clientX)
        if (index >= 0) onSelect(index)
      }
    },
    [eventAtClientX, onSelect]
  )

  const handlePointerLeave = useCallback((): void => {
    if (pointerRef.current.type === 'idle' && hoverRef.current !== -1) {
      hoverRef.current = -1
      setHoverIndex(-1)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      const { events, bounds } = propsRef.current
      if (events.length === 0 || !bounds) return
      const vp = currentViewport()
      const current = selectedIndex < 0 ? 0 : selectedIndex

      let next: number | null = null
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, current - 1)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(events.length - 1, current + 1)
      else if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = events.length - 1
      else if ((e.key === '+' || e.key === '=' || e.key === '-') && vp) {
        e.preventDefault()
        const centerMs = (vp.startMs + vp.endMs) / 2
        viewportRef.current = zoomViewportAt(vp, centerMs, e.key === '-' ? 2 : 0.5, bounds)
        userZoomedRef.current = true
        markDirty()
        return
      } else if (e.key === '0') {
        e.preventDefault()
        viewportRef.current = null
        userZoomedRef.current = false
        markDirty()
        return
      }
      if (next == null) return
      e.preventDefault()
      if (next !== selectedIndex) onSelect(next)
    },
    [currentViewport, markDirty, onSelect, selectedIndex]
  )

  const hoverEvent = hoverIndex >= 0 ? events[hoverIndex] : null
  const hoverLeft = useMemo(() => {
    if (hoverIndex < 0) return 0
    const vp = currentViewport()
    const tMs = times[hoverIndex]
    if (!vp || tMs == null) return 0
    const width = sizeRef.current.width || 1
    return Math.min(Math.max(timeToX(tMs, vp, width) + 10, 4), Math.max(4, width - 224))
  }, [currentViewport, hoverIndex, times])

  const interactive = bounds != null && events.length > 0

  return (
    <div
      ref={hostRef}
      data-testid="replay-timeline"
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, events.length - 1)}
      aria-valuenow={Math.max(0, selectedIndex)}
      aria-valuetext={ariaValueText}
      aria-orientation="horizontal"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative h-16 touch-none select-none overflow-hidden rounded-xl border border-border bg-card',
        interactive ? 'cursor-grab' : 'cursor-default opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      {hoverEvent && (
        <div
          data-testid="replay-timeline-tooltip"
          className="pointer-events-none absolute top-4 z-10 max-w-[220px] rounded-medium border border-border bg-popover px-2 py-1.5 shadow-md"
          style={{ left: hoverLeft }}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-popover-foreground">
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-2 shrink-0 rounded-full bg-current',
                replayKindColorClasses(hoverEvent.kind, hoverEvent.status).text
              )}
            />
            {t(`sessions.replay.kind.${hoverEvent.kind}`)}
            {hoverEvent.toolName && <span className="truncate font-mono text-muted-foreground">{hoverEvent.toolName}</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{hoverEvent.summary}</p>
        </div>
      )}
    </div>
  )
}
