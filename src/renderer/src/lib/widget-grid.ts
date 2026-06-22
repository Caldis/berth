import type { WidgetWidth, WidgetHeight } from '@/components/dashboard/widget-types'

// GH-150: 固定档位网格几何 (纯函数, 直测)。宽 3 档 (1/2/4 列) × 高 2 档 (short/tall)。
// 高度档 1:2 整数倍, 配 grid-auto-rows + grid-flow-row-dense 无空隙填充
// (dnd-kit sortable grid 官方示例亦用固定 gridAutoRows + dense, 非连续 masonry)。

/** grid-auto-rows 基础行单元 (px); mini=1 / short=2 / tall=4 单元 (1:2:4 整数倍)。 */
export const ROW_UNIT = 110
/** 行间距 (px), 与容器 gap-y 一致; 跨多行含 (span-1) 个间距 → 2×mini==short, 2×short==tall。 */
export const ROW_GAP = 24

/** 宽度档 → 响应式 col-span 类 (Tailwind JIT 需字面量, 不可插值)。 */
export function widthColSpanClass(w: WidgetWidth): string {
  switch (w) {
    case 'W1':
      return 'col-span-1'
    case 'W2':
      return 'col-span-1 md:col-span-2 xl:col-span-2'
    case 'W4':
      return 'col-span-1 md:col-span-2 xl:col-span-4'
  }
}

/** 高度档 → grid-row 跨度 (行单元数); mini/short/tall = 1/2/4 (1:2:4 整数倍)。 */
export function heightRowSpan(h: WidgetHeight): number {
  switch (h) {
    case 'mini':
      return 1
    case 'short':
      return 2
    case 'tall':
      return 4
  }
}

/** 高度档内容像素高 (含跨行间距): short=ROW_UNIT, tall=2*ROW_UNIT+ROW_GAP。 */
export function heightPx(h: WidgetHeight): number {
  const span = heightRowSpan(h)
  return span * ROW_UNIT + (span - 1) * ROW_GAP
}

/**
 * 列表类 widget 在给定高度档可显条数 (超出 → 截断 + 查看更多)。
 * rowHeight = 每条估高, reserved = 标题 / footer 预留高。
 */
export function listCapacity(h: WidgetHeight, rowHeight = 52, reserved = 60): number {
  const usable = heightPx(h) - reserved
  return Math.max(1, Math.floor(usable / rowHeight))
}
