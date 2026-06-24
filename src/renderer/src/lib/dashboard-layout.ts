import { WIDGET_CATALOG } from '@/components/dashboard/widget-catalog'
import type { WidgetId, WidgetMeta, WidgetSize, WidgetWidth } from '@/components/dashboard/widget-types'

// GH-138 / GH-150: 仪表盘布局配置纯函数 (parse/migrate/serialize/reset)。localStorage 持久化。
// GH-150 R2 (dashboard 引擎): size = {w: 宽度档, h: 高度行 span}。migrate 容旧:
// v1 字符串 S/M/L/Wide/XL → 宽度档 + h=default; v2 {w} (无 h) → 补 h=default; R2 {w,h} → clamp。
// 钳非法档 / 损坏 JSON 回落默认 — 版本演进与并发写入下不崩。

export const DASHBOARD_LAYOUT_VERSION = 4
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

/** 旧单维尺寸 (v1: S/M/L/Wide/XL) → 宽度档映射 (语义近似保留; 高度后补 default)。 */
const LEGACY_WIDTH_MAP: Record<string, WidgetWidth> = {
  S: 'W1',
  M: 'W2',
  L: 'W2',
  Wide: 'W4',
  XL: 'W4'
}

/** 钳制尺寸: 宽度到允许档 (非法回落 default.w); 高度到 [minH, maxH] (非法回落 default.h)。 */
function clampSize(size: WidgetSize, meta: WidgetMeta): WidgetSize {
  const w = meta.widths.includes(size.w) ? size.w : meta.defaultSize.w
  const rawH = typeof size.h === 'number' && Number.isFinite(size.h) ? size.h : meta.defaultSize.h
  const upper = Math.max(meta.maxH ?? rawH, meta.minH)
  const h = Math.min(Math.max(rawH, meta.minH), upper)
  return { w, h }
}

/** 归一化持久化的 size: 旧字符串/缺 h 迁移 + clamp + 缺失/损坏回落 default。 */
function normalizeSize(raw: unknown, meta: WidgetMeta): WidgetSize {
  // v1 字符串档 → 宽度档 + 补 default 高度。
  if (typeof raw === 'string' && raw in LEGACY_WIDTH_MAP) {
    return clampSize({ w: LEGACY_WIDTH_MAP[raw], h: meta.defaultSize.h }, meta)
  }
  // 对象: v2 {w} (无 h) 或 R2 {w,h}。
  if (raw && typeof raw === 'object' && 'w' in raw) {
    const obj = raw as Partial<WidgetSize>
    const w = (obj.w as WidgetWidth) ?? meta.defaultSize.w
    const h = typeof obj.h === 'number' ? obj.h : meta.defaultSize.h
    return clampSize({ w, h }, meta)
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
  // <4: 行单元语义变更 (88px→28px), 旧 h 失效 → 重置 h 为 catalog 默认 (保留 w/排序/隐藏/chartType)。
  const resetH = (typeof layout?.version === 'number' ? layout.version : 0) < DASHBOARD_LAYOUT_VERSION

  for (const raw of Array.isArray(layout?.widgets) ? layout.widgets : []) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<WidgetLayoutItem>
    if (typeof item.id !== 'string' || !known.has(item.id) || seen.has(item.id as WidgetId)) continue
    const id = item.id as WidgetId
    const meta = catalog[id]
    const size = normalizeSize(item.size, meta)
    const next: WidgetLayoutItem = {
      id,
      size: resetH ? { w: size.w, h: meta.defaultSize.h } : size,
      hidden: Boolean(item.hidden)
    }
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
