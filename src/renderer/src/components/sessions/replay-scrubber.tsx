import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { nearestReplayIndex } from '@/lib/replay-model'

// GH-116: 时间轴刷子 — 参考 Debug 视图: 横向轨道 + 事件刻度 + 拖拽手柄。
// 位置由 lib/replay-model 的归一化坐标驱动; 点击/拖拽吸附到最近事件,
// 键盘 ←/→ 逐事件步进 (role=slider)。

/** 刻度渲染上限 — 超出按步长抽样, 避免上万 DOM 节点拖垮布局。 */
const MAX_TICKS = 1200

interface ReplayScrubberProps {
  /** 归一化事件位置 (0..1, 单调不减), 与过滤后的事件列表一一对应。 */
  positions: readonly number[]
  /** 选中事件在过滤列表中的索引; -1 = 未选中 (手柄停在起点)。 */
  selectedIndex: number
  onSelect: (index: number) => void
  ariaLabel: string
  /** aria-valuetext, 如 "12 / 240 · 0:04:16"。 */
  ariaValueText?: string
  className?: string
}

export function ReplayScrubber({
  positions,
  selectedIndex,
  onSelect,
  ariaLabel,
  ariaValueText,
  className
}: ReplayScrubberProps): React.ReactElement {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)

  const selectFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || positions.length === 0) return
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const index = nearestReplayIndex(positions, fraction)
      if (index >= 0 && index !== selectedIndex) onSelect(index)
    },
    [onSelect, positions, selectedIndex]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      selectFromClientX(event.clientX)
    },
    [selectFromClientX]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return
      selectFromClientX(event.clientX)
    },
    [selectFromClientX]
  )

  const stopDragging = useCallback(() => {
    draggingRef.current = false
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (positions.length === 0) return
      const current = selectedIndex < 0 ? 0 : selectedIndex
      let next: number | null = null
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, current - 1)
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        next = Math.min(positions.length - 1, current + 1)
      } else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = positions.length - 1
      if (next == null) return
      event.preventDefault()
      if (next !== selectedIndex) onSelect(next)
    },
    [onSelect, positions.length, selectedIndex]
  )

  const tickStride = Math.max(1, Math.ceil(positions.length / MAX_TICKS))
  const handleFraction = selectedIndex >= 0 ? (positions[selectedIndex] ?? 0) : 0

  return (
    <div
      ref={trackRef}
      data-testid="replay-scrubber"
      role="slider"
      tabIndex={positions.length > 0 ? 0 : -1}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.max(0, positions.length - 1)}
      aria-valuenow={Math.max(0, selectedIndex)}
      aria-valuetext={ariaValueText}
      aria-orientation="horizontal"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative h-8 cursor-pointer select-none touch-none rounded-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {/* 轨道 */}
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-default-200"
      />
      {/* 事件刻度 (抽样) */}
      {positions.map((position, index) =>
        index % tickStride === 0 ? (
          <span
            key={index}
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-default-400/70"
            style={{ left: `${position * 100}%` }}
          />
        ) : null
      )}
      {/* 手柄 */}
      <span
        data-testid="replay-scrubber-handle"
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 h-5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm transition-[left] duration-75',
          selectedIndex >= 0 ? 'border-primary bg-primary' : 'bg-default-300'
        )}
        style={{ left: `${handleFraction * 100}%` }}
      />
    </div>
  )
}
