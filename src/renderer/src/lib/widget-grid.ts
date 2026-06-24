import type { WidgetWidth } from '@/components/dashboard/widget-types'

// GH-150 R2: 宽度档 (W1/W2/W4) = 离散响应式列跨; 高度 = 行 span (grid-row: span h, 见 dashboard-grid
// grid-auto-rows + 卡片 h-full 撑满该格)。二维 CSS Grid dashboard 引擎。

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

/** 高度行 span → grid-row 样式 (卡片纵向跨 h 个 grid-auto-rows 行单元)。 */
export function gridRowSpanStyle(h: number): { gridRow: string } {
  return { gridRow: `span ${Math.max(1, Math.round(h))}` }
}
