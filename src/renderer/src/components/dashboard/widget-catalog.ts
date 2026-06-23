import type { WidgetId, WidgetMeta } from './widget-types'

// GH-138 / GH-150 R2: widget 元数据单一真源 (纯数据, 无 React/icon 运行时依赖, 可直测)。
// 尺寸 = 宽度档 (defaultSize.w + widths 选项, 离散响应式) + 高度行 span (defaultSize.h, resize 范围 minH/maxH, 连续)。
// default h = 内容最小贴合 (消留白); 固定类 minH=maxH=defaultSize.h 锁定。h span 初值, 待 row-unit CDP 校准。
// 新增 widget: 此处加一条 + widget-registry 绑定 icon/component + i18n 补 titleKey。

export const WIDGET_CATALOG: Record<WidgetId, WidgetMeta> = {
  'stats-band': {
    id: 'stats-band',
    titleKey: 'overview.widgets.statsBand',
    defaultSize: { w: 'W4', h: 2 },
    widths: ['W4'],
    minH: 2,
    maxH: 2,
    defaultOrder: 0,
    defaultHidden: false
  },
  'activity-heatmap': {
    id: 'activity-heatmap',
    titleKey: 'overview.widgets.activityHeatmap',
    defaultSize: { w: 'W4', h: 3 },
    widths: ['W2', 'W4'],
    minH: 3,
    maxH: 4,
    defaultOrder: 1,
    defaultHidden: false
  },
  'activity-insights': {
    id: 'activity-insights',
    titleKey: 'overview.widgets.activityInsights',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 3,
    maxH: 3,
    defaultOrder: 2,
    defaultHidden: false
  },
  'top-usage': {
    id: 'top-usage',
    titleKey: 'overview.widgets.topUsage',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 3,
    maxH: 6,
    defaultOrder: 3,
    defaultHidden: false
  },
  'recent-sessions': {
    id: 'recent-sessions',
    titleKey: 'overview.widgets.recentSessions',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 3,
    maxH: 8,
    defaultOrder: 4,
    defaultHidden: false
  },
  'usage-trend': {
    id: 'usage-trend',
    titleKey: 'overview.widgets.usageTrend',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2', 'W4'],
    minH: 3,
    maxH: 6,
    defaultOrder: 5,
    defaultHidden: false
  },
  'quick-actions': {
    id: 'quick-actions',
    titleKey: 'overview.widgets.quickActions',
    defaultSize: { w: 'W2', h: 2 },
    widths: ['W1', 'W2', 'W4'],
    minH: 2,
    maxH: 2,
    defaultOrder: 6,
    defaultHidden: false
  },
  'token-breakdown': {
    id: 'token-breakdown',
    titleKey: 'overview.widgets.tokenBreakdown',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 2,
    maxH: 6,
    defaultOrder: 7,
    defaultHidden: true
  },
  'model-distribution': {
    id: 'model-distribution',
    titleKey: 'overview.widgets.modelDistribution',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 3,
    maxH: 6,
    defaultOrder: 8,
    defaultHidden: true
  },
  'activity-rhythm': {
    id: 'activity-rhythm',
    titleKey: 'overview.widgets.activityRhythm',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2', 'W4'],
    minH: 3,
    maxH: 4,
    defaultOrder: 9,
    defaultHidden: false
  },
  'session-duration': {
    id: 'session-duration',
    titleKey: 'overview.widgets.sessionDuration',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2'],
    minH: 3,
    maxH: 6,
    defaultOrder: 10,
    defaultHidden: false
  },
  'cumulative-growth': {
    id: 'cumulative-growth',
    titleKey: 'overview.widgets.cumulativeGrowth',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2', 'W4'],
    minH: 3,
    maxH: 6,
    defaultOrder: 11,
    defaultHidden: false
  },
  'model-efficiency': {
    id: 'model-efficiency',
    titleKey: 'overview.widgets.modelEfficiency',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2'],
    minH: 3,
    maxH: 6,
    defaultOrder: 12,
    defaultHidden: true
  },
  'project-allocation': {
    id: 'project-allocation',
    titleKey: 'overview.widgets.projectAllocation',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W1', 'W2'],
    minH: 3,
    maxH: 6,
    defaultOrder: 13,
    defaultHidden: true
  },
  'model-trend': {
    id: 'model-trend',
    titleKey: 'overview.widgets.modelTrend',
    defaultSize: { w: 'W2', h: 3 },
    widths: ['W2', 'W4'],
    minH: 3,
    maxH: 6,
    defaultOrder: 14,
    defaultHidden: true
  },
  spend: {
    id: 'spend',
    titleKey: 'overview.widgets.spend',
    defaultSize: { w: 'W1', h: 3 },
    widths: ['W1', 'W2'],
    minH: 2,
    maxH: 6,
    defaultOrder: 15,
    defaultHidden: true
  }
}

export const ALL_WIDGET_IDS = Object.keys(WIDGET_CATALOG) as WidgetId[]
