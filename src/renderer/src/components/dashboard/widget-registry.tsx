import {
  Activity,
  BarChart3,
  Clock,
  Cpu,
  Timer,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  MessageSquare,
  PieChart,
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

// GH-138: widget 渲染绑定 (元数据来自 widget-catalog, 此处补 icon + component)。
// 新增 widget: 建 *.widget.tsx + 在此注册一条; 未注册的 id 由 grid 优雅跳过。

const REGISTRY: Partial<Record<WidgetId, WidgetDefinition>> = {
  'stats-band': { ...WIDGET_CATALOG['stats-band'], icon: LayoutDashboard, component: StatsBandWidget },
  'activity-heatmap': { ...WIDGET_CATALOG['activity-heatmap'], icon: Activity, component: ActivityHeatmapWidget },
  'activity-insights': { ...WIDGET_CATALOG['activity-insights'], icon: Lightbulb, component: ActivityInsightsWidget },
  'top-usage': { ...WIDGET_CATALOG['top-usage'], icon: ListOrdered, component: TopUsageWidget },
  'recent-sessions': { ...WIDGET_CATALOG['recent-sessions'], icon: MessageSquare, component: RecentSessionsWidget },
  'usage-trend': { ...WIDGET_CATALOG['usage-trend'], icon: BarChart3, component: UsageTrendWidget },
  'quick-actions': { ...WIDGET_CATALOG['quick-actions'], icon: Zap, component: QuickActionsWidget },
  'token-breakdown': { ...WIDGET_CATALOG['token-breakdown'], icon: PieChart, component: TokenBreakdownWidget },
  'model-distribution': { ...WIDGET_CATALOG['model-distribution'], icon: Cpu, component: ModelDistributionWidget },
  'activity-rhythm': { ...WIDGET_CATALOG['activity-rhythm'], icon: Clock, component: ActivityRhythmWidget },
  'session-duration': { ...WIDGET_CATALOG['session-duration'], icon: Timer, component: SessionDurationWidget }
}

export function getWidgetDefinition(id: WidgetId): WidgetDefinition | undefined {
  return REGISTRY[id]
}

export function isWidgetRegistered(id: WidgetId): boolean {
  return Boolean(REGISTRY[id])
}
