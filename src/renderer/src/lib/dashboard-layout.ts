import { WIDGET_CATALOG } from '@/components/dashboard/widget-catalog'
import type { WidgetId, WidgetMeta, WidgetSize } from '@/components/dashboard/widget-types'

// GH-138: 仪表盘布局配置纯函数 (parse/migrate/serialize/reset)。localStorage 持久化
// (复用 theme-provider 直读直写模式)。migrate 容旧: 丢未知 widget / 末尾追加新注册 widget /
// 钳制非法尺寸 / 损坏 JSON 回落默认 — 保证版本演进与并发写入下不崩。

export const DASHBOARD_LAYOUT_VERSION = 1
export const DASHBOARD_LAYOUT_STORAGE_KEY = 'berth-dashboard-layout'

export interface WidgetLayoutItem {
  id: WidgetId
  size: WidgetSize
  hidden: boolean
}

export interface DashboardLayout {
  version: number
  widgets: WidgetLayoutItem[]
}

type Catalog = Record<WidgetId, WidgetMeta>

/** 默认布局: 全部 widget 按 defaultOrder 排列, 取各自 defaultSize/defaultHidden。 */
export function defaultLayout(catalog: Catalog = WIDGET_CATALOG): DashboardLayout {
  const widgets = Object.values(catalog)
    .slice()
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((meta) => ({ id: meta.id, size: meta.defaultSize, hidden: meta.defaultHidden }))
  return { version: DASHBOARD_LAYOUT_VERSION, widgets }
}

/** 迁移已存布局到当前 catalog: 丢未知/重复, 钳制非法尺寸, 末尾追加缺失 widget。 */
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
    const size =
      typeof item.size === 'string' && meta.sizes.includes(item.size as WidgetSize)
        ? (item.size as WidgetSize)
        : meta.defaultSize
    widgets.push({ id, size, hidden: Boolean(item.hidden) })
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
