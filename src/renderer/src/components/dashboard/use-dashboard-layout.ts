import { useCallback, useMemo, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  defaultLayout,
  parseLayout,
  serializeLayout,
  type DashboardLayout,
  type WidgetLayoutItem
} from '@/lib/dashboard-layout'
import type { WidgetId, WidgetSize } from './widget-types'

// GH-138: 仪表盘布局状态 + localStorage 持久化 + 动作 (reorder/setSize/hide/show/reset)。
// 函数式 setState 避免并发更新的陈旧闭包; 写入失败 (配额) 静默降级为内存态。

function readInitial(): DashboardLayout {
  if (typeof localStorage === 'undefined') return defaultLayout()
  return parseLayout(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY))
}

export interface DashboardLayoutController {
  layout: DashboardLayout
  visibleWidgets: WidgetLayoutItem[]
  hiddenWidgets: WidgetLayoutItem[]
  reorder: (activeId: WidgetId, overId: WidgetId) => void
  setSize: (id: WidgetId, size: WidgetSize) => void
  setChartType: (id: WidgetId, chartType: string) => void
  hide: (id: WidgetId) => void
  show: (id: WidgetId) => void
  reset: () => void
}

export function useDashboardLayout(): DashboardLayoutController {
  const [layout, setLayout] = useState<DashboardLayout>(readInitial)

  const apply = useCallback((mutate: (current: DashboardLayout) => DashboardLayout) => {
    setLayout((prev) => {
      const next = mutate(prev)
      try {
        localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, serializeLayout(next))
      } catch {
        /* storage unavailable / quota — keep in-memory state */
      }
      return next
    })
  }, [])

  const reorder = useCallback(
    (activeId: WidgetId, overId: WidgetId) => {
      if (activeId === overId) return
      apply((current) => {
        const ids = current.widgets.map((w) => w.id)
        const from = ids.indexOf(activeId)
        const to = ids.indexOf(overId)
        if (from < 0 || to < 0) return current
        return { ...current, widgets: arrayMove(current.widgets, from, to) }
      })
    },
    [apply]
  )

  const setSize = useCallback(
    (id: WidgetId, size: WidgetSize) => {
      apply((current) => ({
        ...current,
        widgets: current.widgets.map((w) => (w.id === id ? { ...w, size } : w))
      }))
    },
    [apply]
  )

  const setChartType = useCallback(
    (id: WidgetId, chartType: string) => {
      apply((current) => ({
        ...current,
        widgets: current.widgets.map((w) => (w.id === id ? { ...w, chartType } : w))
      }))
    },
    [apply]
  )

  const setHidden = useCallback(
    (id: WidgetId, hidden: boolean) => {
      apply((current) => ({
        ...current,
        widgets: current.widgets.map((w) => (w.id === id ? { ...w, hidden } : w))
      }))
    },
    [apply]
  )

  const hide = useCallback((id: WidgetId) => setHidden(id, true), [setHidden])
  const show = useCallback((id: WidgetId) => setHidden(id, false), [setHidden])
  const reset = useCallback(() => apply(() => defaultLayout()), [apply])

  const visibleWidgets = useMemo(() => layout.widgets.filter((w) => !w.hidden), [layout])
  const hiddenWidgets = useMemo(() => layout.widgets.filter((w) => w.hidden), [layout])

  return { layout, visibleWidgets, hiddenWidgets, reorder, setSize, setChartType, hide, show, reset }
}
