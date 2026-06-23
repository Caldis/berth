import { WIDGET_CATALOG } from '@/components/dashboard/widget-catalog'
import type { WidgetId, WidgetMeta, WidgetSize } from '@/components/dashboard/widget-types'

// GH-138 / GH-150: 仪表盘布局配置纯函数 (parse/migrate/serialize/reset)。localStorage 持久化。
// migrate 容旧: 丢未知 widget / 末尾追加新注册 / 旧 size (v1 字符串 S/M/L/Wide/XL 或 v2 {w,h})
// 归一到宽度档 {w} (GH-150 移除高度维度) / 钳制非法档 / 损坏 JSON 回落默认 — 版本演进与并发写入下不崩。

export const DASHBOARD_LAYOUT_VERSION = 2
export const DASHBOARD_LAYOUT_STORAGE_KEY = 'berth-dashboard-layout'

export interface WidgetLayoutItem {
  id: WidgetId
  size: WidgetSize
  hidden: boolean
  /** 可视化形态 (bar/pie/donut/line/area…); 各 widget 自行解释与容错回落, 布局层只透传持久化。 */
  chartType?: string
}

export interface DashboardLayout {
  version: number
  widgets: WidgetLayoutItem[]
}

type Catalog = Record<WidgetId, WidgetMeta>

/** 旧单维尺寸 (v1: S/M/L/Wide/XL) → 二维档位映射 (语义近似保留)。 */
const LEGACY_SIZE_MAP: Record<string, WidgetSize> = {
  S: { w: 'W1' },
  M: { w: 'W2' },
  L: { w: 'W2' },
  Wide: { w: 'W4' },
  XL: { w: 'W4' }
}

/** 钳制尺寸到 widget 允许的宽度档; 非法回落 defaultSize.w。 */
function clampSize(size: WidgetSize, meta: WidgetMeta): WidgetSize {
  const w = meta.widths.includes(size.w) ? size.w : meta.defaultSize.w
  return { w }
}

/** 归一化持久化的 size: 旧字符串迁移 + 新对象钳制 + 缺失/损坏回落 default。 */
function normalizeSize(raw: unknown, meta: WidgetMeta): WidgetSize {
  if (typeof raw === 'string' && raw in LEGACY_SIZE_MAP) return clampSize(LEGACY_SIZE_MAP[raw], meta)
  if (raw && typeof raw === 'object' && 'w' in raw) {
    return clampSize(raw as WidgetSize, meta)
  }
  return meta.defaultSize
}

/** 默认布局: 全部 widget 按 defaultOrder 排列, 取各自 defaultSize/defaultHidden。 */
export function defaultLayout(catalog: Catalog = WIDGET_CATALOG): DashboardLayout {
  const widgets = Object.values(catalog)
    .slice()
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((meta) => ({ id: meta.id, size: meta.defaultSize, hidden: meta.defaultHidden }))
  return { version: DASHBOARD_LAYOUT_VERSION, widgets }
}

/** 迁移已存布局到当前 catalog: 丢未知/重复, 旧 size 迁移 + 钳制, 末尾追加缺失 widget。 */
export function migrateLayout(layout: DashboardLayout, catalog: Catalog = WIDGET_CATALOG): DashboardLayout {
  const known = new Set<string>(Object.keys(catalog))
  const seen = new Set<WidgetId>()
  const widgets: WidgetLayoutItem[] = []

  for (const raw of Array.isArray(layout?.widgets) ? layout.widgets : []) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<WidgetLayoutItem>
    if (typeof item.id !== 'string' || !known.has(item.id) || seen.has(item.id as WidgetId)) continue
    const id = item.id as WidgetId
    const meta = catalog[id]
    const next: WidgetLayoutItem = { id, size: normalizeSize(item.size, meta), hidden: Boolean(item.hidden) }
    if (typeof item.chartType === 'string' && item.chartType) next.chartType = item.chartType
    widgets.push(next)
    seen.add(id)
  }

  const missing = Object.values(catalog)
    .filter((meta) => !seen.has(meta.id))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
  for (const meta of missing) {
    widgets.push({ id: meta.id, size: meta.defaultSize, hidden: meta.defaultHidden })
  }

  return { version: DASHBOARD_LAYOUT_VERSION, widgets }
}

/** 解析 localStorage 原始串 → 迁移后布局; 空/损坏/非法形状回落默认。 */
export function parseLayout(raw: string | null | undefined, catalog: Catalog = WIDGET_CATALOG): DashboardLayout {
  if (!raw) return defaultLayout(catalog)
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaultLayout(catalog)
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as DashboardLayout).widgets)) {
    return defaultLayout(catalog)
  }
  return migrateLayout(parsed as DashboardLayout, catalog)
}

export function serializeLayout(layout: DashboardLayout): string {
  return JSON.stringify(layout)
}

export function resetLayout(catalog: Catalog = WIDGET_CATALOG): DashboardLayout {
  return defaultLayout(catalog)
}
