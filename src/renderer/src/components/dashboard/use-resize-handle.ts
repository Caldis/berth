import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

// GH-150 R2 (dashboard 引擎): 高度 resize 手柄。拖拽改 h 行 span (量化到行单元 + clamp),
// move 实时回写 (framer layout 平滑过渡)。宽度走宽度档切换器 (widget-shell header), 此处只管高度。

/** delta 像素 → 新 h span (量化 + clamp)。纯函数, 可测。 */
export function deltaToSpan(startH: number, dy: number, pxPerSpan: number, minH: number, maxH: number): number {
  const next = startH + Math.round(dy / pxPerSpan)
  return Math.min(Math.max(next, minH), Math.max(minH, maxH))
}

interface Options {
  /** 当前 h 行 span。 */
  h: number
  minH: number
  maxH: number
  /** 每个 span 的像素高 (= rowUnit + row gap)。 */
  pxPerSpan: number
  /** 拖拽中实时回写新 h。 */
  onChange: (h: number) => void
}

interface ResizeHandlers {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
}

/** 高度 resize 手柄: pointer 拖拽量化改 h, 实时 onChange; resizing 供视觉反馈。 */
export function useResizeHandle({ h, minH, maxH, pxPerSpan, onChange }: Options): {
  resizing: boolean
  handlers: ResizeHandlers
} {
  const start = useRef<{ y: number; h: number } | null>(null)
  const [resizing, setResizing] = useState(false)

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      start.current = { y: e.clientY, h }
      setResizing(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [h]
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!start.current) return
      onChange(deltaToSpan(start.current.h, e.clientY - start.current.y, pxPerSpan, minH, maxH))
    },
    [pxPerSpan, minH, maxH, onChange]
  )

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    start.current = null
    setResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* capture 已释放, 忽略 */
    }
  }, [])

  return { resizing, handlers: { onPointerDown, onPointerMove, onPointerUp } }
}
