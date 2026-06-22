import { useCallback, useEffect, useRef, useState } from 'react'
import { ROW_UNIT, ROW_GAP } from '@/lib/widget-grid'

// GH-150: 内容驱动高度的整数倍量化。测网格项内容真实高 → gridRow span =
// ceil((内容高 + 间距) / ROW_UNIT)。grid 容器 items-start 使项盒 = 内容自然高
// (不被拉伸到 grid area), offsetHeight 稳定 = 内容高, 无测量反馈回环。配 gridAutoRows:ROW_UNIT
// + grid-flow-row-dense: 卡片贴合内容 (零内留白)、高度整数倍对齐、dense 填空无空隙。

export function useMasonryRowSpan(): {
  setRef: (node: HTMLElement | null) => void
  span: number | undefined
} {
  const elRef = useRef<HTMLElement | null>(null)
  const [span, setSpan] = useState<number>()

  const measure = useCallback((): void => {
    const el = elRef.current
    if (!el) return
    const height = el.offsetHeight
    if (height <= 0) return
    setSpan(Math.max(1, Math.ceil((height + ROW_GAP) / ROW_UNIT)))
  }, [])

  useEffect(() => {
    const el = elRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(el)
    measure()
    return () => observer.disconnect()
  }, [measure])

  const setRef = useCallback(
    (node: HTMLElement | null): void => {
      elRef.current = node
      if (node) measure()
    },
    [measure]
  )

  return { setRef, span }
}
