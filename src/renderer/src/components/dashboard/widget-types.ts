import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

// GH-138: widget 仪表盘契约。元数据 (WidgetMeta) 与渲染绑定 (WidgetDefinition) 分离 —
// 布局逻辑 (lib/dashboard-layout) 只依赖纯元数据, 不碰 icon/component, 便于直测与复用。

export type WidgetWidth = 'W1' | 'W2' | 'W4'

/** widget 尺寸 = 宽度档 (离散响应式列跨) + 高度行 span (连续, resize 量化到行单元)。
 *  GH-150 R2: 概览重构为二维 CSS Grid dashboard 引擎, 高度回归为数值 span。 */
export interface WidgetSize {
  w: WidgetWidth
  h: number
}

export type WidgetId =
  | 'stats-band'
  | 'activity-heatmap'
  | 'activity-insights'
  | 'top-usage'
  | 'recent-sessions'
  | 'usage-trend'
  | 'quick-actions'
  | 'token-breakdown'
  | 'model-distribution'
  | 'activity-rhythm'
  | 'session-duration'
  | 'cumulative-growth'
  | 'model-efficiency'
  | 'project-allocation'
  | 'model-trend'
  | 'spend'

/** widget 纯元数据 — 与渲染解耦; 新增 widget 在 widget-catalog 加一条。 */
export interface WidgetMeta {
  id: WidgetId
  titleKey: string
  defaultSize: WidgetSize
  /** 允许的宽度档 (尺寸切换选项)。 */
  widths: WidgetWidth[]
  /** 高度行 span 下界 (resize 最小)。 */
  minH: number
  /** 高度行 span 上界 (resize 最大; 省略或等于 minH 即高度固定不可 resize)。 */
  maxH?: number
  /** 默认布局排序。 */
  defaultOrder: number
  /** 默认不在布局 (需用户从 widget 库添加)。 */
  defaultHidden: boolean
}

/** widget 渲染契约 — widget 自行经 hooks 取数; 接收尺寸 + (可选) 持久化的可视化形态。 */
export interface WidgetRenderProps {
  /** 宽度档 (列跨)。 */
  w: WidgetWidth
  /** 高度行 span (内容自适应: 列表类按它算行数; 固定/图表类可忽略, 走 height:100% 填满)。 */
  h?: number
  /** 已持久化的图表形态 (来自 layout); 未设时 widget 用自身默认。 */
  chartType?: string
  /** 用户切换形态时回调 (持久化进 layout); 缺省时 widget 退化为本地态 (如库内预览)。 */
  onChartTypeChange?: (chartType: string) => void
}

/** widget 完整定义 = 元数据 + 渲染绑定 (registry 用; 渲染层填充 icon/component)。 */
export interface WidgetDefinition extends WidgetMeta {
  icon: LucideIcon
  component: ComponentType<WidgetRenderProps>
}
