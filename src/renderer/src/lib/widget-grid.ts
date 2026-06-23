import type { WidgetWidth } from '@/components/dashboard/widget-types'

// GH-150: 宽度档 (W1/W2/W4) = 固定响应式列跨; 卡片高度由同行 align-stretch 等高决定
// (见 dashboard-grid: grid 默认 items-stretch + 卡片 h-full)。等高 > 贴合零留白 (用户定)。

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
