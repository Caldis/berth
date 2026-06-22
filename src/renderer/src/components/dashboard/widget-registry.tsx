import { memo } from 'react'
import {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  FolderTree,
  Gauge,
  Layers,
  Timer,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  MessageSquare,
  PieChart,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react'
import type { WidgetDefinition, WidgetId } from './widget-types'
import { WIDGET_CATALOG } from './widget-catalog'
import { StatsBandWidget } from './widgets/stats-band.widget'
import { ActivityHeatmapWidget } from './widgets/activity-heatmap.widget'
import { ActivityInsightsWidget } from './widgets/activity-insights.widget'
import { TopUsageWidget } from './widgets/top-usage.widget'
import { RecentSessionsWidget } from './widgets/recent-sessions.widget'
import { QuickActionsWidget } from './widgets/quick-actions.widget'
import { UsageTrendWidget } from './widgets/usage-trend.widget'
import { TokenBreakdownWidget } from './widgets/token-breakdown.widget'
import { ModelDistributionWidget } from './widgets/model-distribution.widget'
import { ActivityRhythmWidget } from './widgets/activity-rhythm.widget'
import { SessionDurationWidget } from './widgets/session-duration.widget'
import { CumulativeGrowthWidget } from './widgets/cumulative-growth.widget'
import { ModelEfficiencyWidget } from './widgets/model-efficiency.widget'
import { ProjectAllocationWidget } from './widgets/project-allocation.widget'
import { ModelTrendWidget } from './widgets/model-trend.widget'
import { SpendWidget } from './widgets/spend.widget'

// GH-138 / GH-150: widget 渲染绑定 (元数据来自 widget-catalog, 此处补 icon + component)。
// 每个 component 经 React.memo 包裹: 拖拽期 WidgetCard 传入的 w/h/chartType/onChartTypeChange
// 均为稳定值 (原始档位 + useCallback), memo 命中 → 重型图表 (recharts) 不随 dnd over 变化重渲染。
// 新增 widget: 建 *.widget.tsx + 在此注册一条; 未注册的 id 由 grid 优雅跳过。

const REGISTRY: Partial<Record<WidgetId, WidgetDefinition>> = {
  'stats-band': { ...WIDGET_CATALOG['stats-band'], icon: LayoutDashboard, component: memo(StatsBandWidget) },
  'activity-heatmap': { ...WIDGET_CATALOG['activity-heatmap'], icon: Activity, component: memo(ActivityHeatmapWidget) },
  'activity-insights': { ...WIDGET_CATALOG['activity-insights'], icon: Lightbulb, component: memo(ActivityInsightsWidget) },
  'top-usage': { ...WIDGET_CATALOG['top-usage'], icon: ListOrdered, component: memo(TopUsageWidget) },
  'recent-sessions': { ...WIDGET_CATALOG['recent-sessions'], icon: MessageSquare, component: memo(RecentSessionsWidget) },
  'usage-trend': { ...WIDGET_CATALOG['usage-trend'], icon: BarChart3, component: memo(UsageTrendWidget) },
  'quick-actions': { ...WIDGET_CATALOG['quick-actions'], icon: Zap, component: memo(QuickActionsWidget) },
  'token-breakdown': { ...WIDGET_CATALOG['token-breakdown'], icon: PieChart, component: memo(TokenBreakdownWidget) },
  'model-distribution': { ...WIDGET_CATALOG['model-distribution'], icon: Cpu, component: memo(ModelDistributionWidget) },
  'activity-rhythm': { ...WIDGET_CATALOG['activity-rhythm'], icon: Clock, component: memo(ActivityRhythmWidget) },
  'session-duration': { ...WIDGET_CATALOG['session-duration'], icon: Timer, component: memo(SessionDurationWidget) },
  'cumulative-growth': { ...WIDGET_CATALOG['cumulative-growth'], icon: TrendingUp, component: memo(CumulativeGrowthWidget) },
  'model-efficiency': { ...WIDGET_CATALOG['model-efficiency'], icon: Gauge, component: memo(ModelEfficiencyWidget) },
  'project-allocation': { ...WIDGET_CATALOG['project-allocation'], icon: FolderTree, component: memo(ProjectAllocationWidget) },
  'model-trend': { ...WIDGET_CATALOG['model-trend'], icon: Layers, component: memo(ModelTrendWidget) },
  spend: { ...WIDGET_CATALOG['spend'], icon: Wallet, component: memo(SpendWidget) }
}

export function getWidgetDefinition(id: WidgetId): WidgetDefinition | undefined {
  return REGISTRY[id]
}

export function isWidgetRegistered(id: WidgetId): boolean {
  return Boolean(REGISTRY[id])
}
