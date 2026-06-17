import type { WidgetId, WidgetMeta } from './widget-types'

// GH-138: widget 元数据单一真源 (纯数据, 无 React/icon 运行时依赖, 可直测)。
// 新增 widget: 此处加一条 + widget-registry 绑定 icon/component + i18n 补 titleKey。

export const WIDGET_CATALOG: Record<WidgetId, WidgetMeta> = {
  'stats-band': {
    id: 'stats-band',
    titleKey: 'overview.widgets.statsBand',
    defaultSize: 'Wide',
    sizes: ['Wide', 'XL'],
    defaultOrder: 0,
    defaultHidden: false
  },
  'activity-heatmap': {
    id: 'activity-heatmap',
    titleKey: 'overview.widgets.activityHeatmap',
    defaultSize: 'XL',
    sizes: ['Wide', 'XL'],
    defaultOrder: 1,
    defaultHidden: false
  },
  'activity-insights': {
    id: 'activity-insights',
    titleKey: 'overview.widgets.activityInsights',
    defaultSize: 'M',
    sizes: ['S', 'M', 'L'],
    defaultOrder: 2,
    defaultHidden: false
  },
  'top-usage': {
    id: 'top-usage',
    titleKey: 'overview.widgets.topUsage',
    defaultSize: 'M',
    sizes: ['S', 'M', 'L'],
    defaultOrder: 3,
    defaultHidden: false
  },
  'recent-sessions': {
    id: 'recent-sessions',
    titleKey: 'overview.widgets.recentSessions',
    defaultSize: 'L',
    sizes: ['S', 'M', 'L'],
    defaultOrder: 4,
    defaultHidden: false
  },
  'usage-trend': {
    id: 'usage-trend',
    titleKey: 'overview.widgets.usageTrend',
    defaultSize: 'Wide',
    sizes: ['M', 'L', 'Wide'],
    defaultOrder: 5,
    defaultHidden: false
  },
  'quick-actions': {
    id: 'quick-actions',
    titleKey: 'overview.widgets.quickActions',
    defaultSize: 'M',
    sizes: ['S', 'M', 'Wide'],
    defaultOrder: 6,
    defaultHidden: false
  },
  'token-breakdown': {
    id: 'token-breakdown',
    titleKey: 'overview.widgets.tokenBreakdown',
    defaultSize: 'M',
    sizes: ['S', 'M', 'L'],
    defaultOrder: 7,
    defaultHidden: true
  },
  'model-distribution': {
    id: 'model-distribution',
    titleKey: 'overview.widgets.modelDistribution',
    defaultSize: 'M',
    sizes: ['S', 'M', 'L'],
    defaultOrder: 8,
    defaultHidden: true
  },
  'activity-rhythm': {
    id: 'activity-rhythm',
    titleKey: 'overview.widgets.activityRhythm',
    defaultSize: 'Wide',
    sizes: ['Wide', 'XL'],
    defaultOrder: 9,
    defaultHidden: false
  }
}

export const ALL_WIDGET_IDS = Object.keys(WIDGET_CATALOG) as WidgetId[]
