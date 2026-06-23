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
import type { WidgetId, WidgetWidth } from './widget-types'

// GH-138 / GH-150: 仪表盘布局状态 + localStorage 持久化 + 动作 (reorder/setWidth/hide/show/reset)。
// 函数式 setState 避免并发更新的陈旧闭包; 写入失败 (配额) 静默降级为内存态。
// lastAddedId: show 新增 widget 时记录, 供 grid 滚动聚焦 + 高亮, 聚焦后由 clearLastAdded 清。

function readInitial(): DashboardLayout {
  if (typeof localStorage === 'undefined') return defaultLayout()
  return parseLayout(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY))
}

export interface DashboardLayoutController {
  layout: DashboardLayout
  visibleWidgets: WidgetLayoutItem[]
  hiddenWidgets: WidgetLayoutItem[]
  lastAddedId: WidgetId | null
  reorder: (activeId: WidgetId, overId: WidgetId) => void
  setWidth: (id: WidgetId, w: WidgetWidth) => void
  setChartType: (id: WidgetId, chartType: string) => void
  hide: (id: WidgetId) => void
  show: (id: WidgetId) => void
  clearLastAdded: (id: WidgetId) => void
  reset: () => void
}

export function useDashboardLayout(): DashboardLayoutController {
  const [layout, setLayout] = useState<DashboardLayout>(readInitial)
  const [lastAddedId, setLastAddedId] = useState<WidgetId | null>(null)

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

  const setWidth = useCallback(
    (id: WidgetId, w: WidgetWidth) => {
      apply((current) => ({
        ...current,
        widgets: current.widgets.map((wd) => (wd.id === id ? { ...wd, size: { ...wd.size, w } } : wd))
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
  const show = useCallback(
    (id: WidgetId) => {
      setHidden(id, false)
      setLastAddedId(id)
    },
    [setHidden]
  )
  const clearLastAdded = useCallback((id: WidgetId) => {
    setLastAddedId((cur) => (cur === id ? null : cur))
  }, [])
  const reset = useCallback(() => apply(() => defaultLayout()), [apply])

  const visibleWidgets = useMemo(() => layout.widgets.filter((w) => !w.hidden), [layout])
  const hiddenWidgets = useMemo(() => layout.widgets.filter((w) => w.hidden), [layout])

  return {
    layout,
    visibleWidgets,
    hiddenWidgets,
    lastAddedId,
    reorder,
    setWidth,
    setChartType,
    hide,
    show,
    clearLastAdded,
    reset
  }
}
