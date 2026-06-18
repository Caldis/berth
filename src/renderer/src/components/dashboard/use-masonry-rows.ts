import { useCallback, useEffect, useRef, useState } from 'react'

// GH-138 U7 真·瀑布流: CSS-Grid row-span masonry。容器 grid-auto-rows:1px + row-gap:0,
// 每个 widget 按内容真实高度算 row 跨度 (= 内容高 + 视觉间距), 配合 grid-flow-row-dense,
// 后续 widget 自动上提填满竖向空隙 → 消除"行轨道对齐"留下的死白, 同时 col-span 宽度变体不变。
//
// 关键: 网格项 align-self:start (容器 items-start) 使项盒 = 内容自然高 (不被拉伸到 grid area),
// 故 offsetHeight 稳定 = 内容高, 设置 rowSpan 只改 grid area 不改项盒 → 无测量反馈回环。
// 入场 slide-in / dnd 均为 transform (视觉), 不影响 offsetHeight, 测量全程稳定。

/** grid-auto-rows 行单位 (px); 1px 给最细粒度, span 直接以像素表达。 */
const ROW_UNIT = 1
/** 烘焙进 span 的竖向间距 (px), 等价原 gap-y-7 (1.75rem); 落在每项 grid area 底部即行间距。 */
const ROW_GAP = 28

/**
 * 返回一个 callback ref + 当前 rowSpan。把 ref 挂到网格项 (与 dnd setNodeRef 合并),
 * 用 `style={{ gridRowEnd: span ? 'span ' + span : undefined }}` 应用跨度。
 * ResizeObserver 监听内容高度变化 (含图表异步渲染 / 尺寸切换 / 列宽 reflow) 实时重算。
 */
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
    // 项盒 = 内容高; grid-auto-rows:1px 下 span(px) = 内容高 + 间距 (间距作为底部留白 = 行间距)。
    setSpan(Math.max(1, Math.ceil(height) + ROW_GAP) * ROW_UNIT)
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
