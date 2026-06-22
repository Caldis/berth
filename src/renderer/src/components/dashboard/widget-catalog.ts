import type { WidgetId, WidgetMeta } from './widget-types'

// GH-138 / GH-150: widget 元数据单一真源 (纯数据, 无 React/icon 运行时依赖, 可直测)。
// 尺寸为二维固定档位: defaultSize {w,h} + 允许的 widths/heights (尺寸切换选项)。
// 新增 widget: 此处加一条 + widget-registry 绑定 icon/component + i18n 补 titleKey。

export const WIDGET_CATALOG: Record<WidgetId, WidgetMeta> = {
  'stats-band': {
    id: 'stats-band',
    titleKey: 'overview.widgets.statsBand',
    defaultSize: { w: 'W4', h: 'mini' },
    widths: ['W4'],
    heights: ['mini'],
    defaultOrder: 0,
    defaultHidden: false
  },
  'activity-heatmap': {
    id: 'activity-heatmap',
    titleKey: 'overview.widgets.activityHeatmap',
    defaultSize: { w: 'W4', h: 'short' },
    widths: ['W2', 'W4'],
    heights: ['short', 'tall'],
    defaultOrder: 1,
    defaultHidden: false
  },
  'activity-insights': {
    id: 'activity-insights',
    titleKey: 'overview.widgets.activityInsights',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 2,
    defaultHidden: false
  },
  'top-usage': {
    id: 'top-usage',
    titleKey: 'overview.widgets.topUsage',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 3,
    defaultHidden: false
  },
  'recent-sessions': {
    id: 'recent-sessions',
    titleKey: 'overview.widgets.recentSessions',
    defaultSize: { w: 'W2', h: 'tall' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 4,
    defaultHidden: false
  },
  'usage-trend': {
    id: 'usage-trend',
    titleKey: 'overview.widgets.usageTrend',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2', 'W4'],
    heights: ['short', 'tall'],
    defaultOrder: 5,
    defaultHidden: false
  },
  'quick-actions': {
    id: 'quick-actions',
    titleKey: 'overview.widgets.quickActions',
    defaultSize: { w: 'W2', h: 'mini' },
    widths: ['W1', 'W2', 'W4'],
    heights: ['mini', 'short'],
    defaultOrder: 6,
    defaultHidden: false
  },
  'token-breakdown': {
    id: 'token-breakdown',
    titleKey: 'overview.widgets.tokenBreakdown',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 7,
    defaultHidden: true
  },
  'model-distribution': {
    id: 'model-distribution',
    titleKey: 'overview.widgets.modelDistribution',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 8,
    defaultHidden: true
  },
  'activity-rhythm': {
    id: 'activity-rhythm',
    titleKey: 'overview.widgets.activityRhythm',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2', 'W4'],
    heights: ['short', 'tall'],
    defaultOrder: 9,
    defaultHidden: false
  },
  'session-duration': {
    id: 'session-duration',
    titleKey: 'overview.widgets.sessionDuration',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2'],
    heights: ['short', 'tall'],
    defaultOrder: 10,
    defaultHidden: false
  },
  'cumulative-growth': {
    id: 'cumulative-growth',
    titleKey: 'overview.widgets.cumulativeGrowth',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2', 'W4'],
    heights: ['short', 'tall'],
    defaultOrder: 11,
    defaultHidden: false
  },
  'model-efficiency': {
    id: 'model-efficiency',
    titleKey: 'overview.widgets.modelEfficiency',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2'],
    heights: ['short', 'tall'],
    defaultOrder: 12,
    defaultHidden: true
  },
  'project-allocation': {
    id: 'project-allocation',
    titleKey: 'overview.widgets.projectAllocation',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W1', 'W2'],
    heights: ['short', 'tall'],
    defaultOrder: 13,
    defaultHidden: true
  },
  'model-trend': {
    id: 'model-trend',
    titleKey: 'overview.widgets.modelTrend',
    defaultSize: { w: 'W2', h: 'short' },
    widths: ['W2', 'W4'],
    heights: ['short', 'tall'],
    defaultOrder: 14,
    defaultHidden: true
  },
  spend: {
    id: 'spend',
    titleKey: 'overview.widgets.spend',
    defaultSize: { w: 'W1', h: 'mini' },
    widths: ['W1', 'W2'],
    heights: ['mini', 'short', 'tall'],
    defaultOrder: 15,
    defaultHidden: true
  }
}

export const ALL_WIDGET_IDS = Object.keys(WIDGET_CATALOG) as WidgetId[]
