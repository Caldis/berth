import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

// GH-138: widget 仪表盘契约。元数据 (WidgetMeta) 与渲染绑定 (WidgetDefinition) 分离 —
// 布局逻辑 (lib/dashboard-layout) 只依赖纯元数据, 不碰 icon/component, 便于直测与复用。

export type WidgetSize = 'S' | 'M' | 'L' | 'Wide' | 'XL'

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

/** widget 纯元数据 — 与渲染解耦; 新增 widget 在 widget-catalog 加一条。 */
export interface WidgetMeta {
  id: WidgetId
  titleKey: string
  defaultSize: WidgetSize
  /** 允许尺寸 (尺寸循环选项, 数组序即循环序)。 */
  sizes: WidgetSize[]
  /** 默认布局排序。 */
  defaultOrder: number
  /** 默认不在布局 (需用户从 widget 库添加)。 */
  defaultHidden: boolean
}

/** widget 渲染契约 — widget 自行经 hooks 取数; 接收尺寸 + (可选) 持久化的可视化形态。 */
export interface WidgetRenderProps {
  size: WidgetSize
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
