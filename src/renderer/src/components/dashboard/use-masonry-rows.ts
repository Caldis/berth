import { useCallback, useEffect, useRef, useState } from 'react'
import { ROW_UNIT, CARD_CHROME } from '@/lib/widget-grid'

// GH-150: 内容驱动高度的整数倍量化。setRef 挂在卡片**内层内容层** (header+children, 自然高,
// 不被 stretch), 测其真实高 → gridRow span = ceil((内容高 + 卡片 chrome) / ROW_UNIT)。
// 卡片 (section) 则撑满 grid area (span×ROW_UNIT) → 可见高度恒为 ROW_UNIT 整数倍, 卡片间距
// 由统一 grid gap 决定 (不再有 0~7px 量化余量错位)。配 gridAutoRows:ROW_UNIT + dense 填空。

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
    setSpan(Math.max(1, Math.ceil((height + CARD_CHROME) / ROW_UNIT)))
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
