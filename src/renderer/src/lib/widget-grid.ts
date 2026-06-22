import type { WidgetWidth } from '@/components/dashboard/widget-types'

// GH-150: 内容驱动高度 + 整数倍量化网格。宽度档 (W1/W2/W4) 是固定响应式列跨; 高度由内容驱动 —
// use-masonry-rows 测内容真实高 → gridRow span = ceil((内容高 + 间距) / ROW_UNIT)。配
// gridAutoRows:ROW_UNIT + grid-flow-row-dense: 卡片贴合内容 (零内留白) 且高度恒为 ROW_UNIT
// 整数倍 (规整网格 + dense 无空隙); 高度档只控内容多少, 不强制档高。

/** grid-auto-rows 基础行单元 (px); 1px = 卡片高精确贴合内容、卡片间距完全一致 (无量化余量错位)。 */
export const ROW_UNIT = 1
/** 烘焙进 span 的卡片间竖向间距 (px); span 把它算进高度 → 统一行间距, 替代 grid row-gap。 */
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
