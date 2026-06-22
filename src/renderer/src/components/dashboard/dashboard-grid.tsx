import { useCallback, useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { WidgetShell } from './widget-shell'
import { getWidgetDefinition } from './widget-registry'
import { WIDGET_CATALOG } from './widget-catalog'
import type { WidgetId, WidgetWidth, WidgetHeight } from './widget-types'
import type { WidgetLayoutItem } from '@/lib/dashboard-layout'
import { ROW_UNIT, widthColSpanClass } from '@/lib/widget-grid'
import { useMasonryRowSpan } from './use-masonry-rows'

// GH-138 / GH-150: 固定档位仪表盘网格 — CSS Grid (gridAutoRows + col/row span + grid-flow-row-dense)。
// 拖拽 (仅编辑态): dnd-kit sortable + DragOverlay 浮层克隆 — 拖拽期底层 widget 静止, 各 widget
// 组件自身 memo 不重渲染重型图表, 仅浮层动; transform 用 CSS.Translate 丢弃 strategy 的 scale,
// 杜绝异尺寸交换的缩放变形 (rectSortingStrategy 返回 scaleX/scaleY=目标/自身尺寸比)。

interface WidgetActions {
  onSetWidth: (id: WidgetId, w: WidgetWidth) => void
  onSetHeight: (id: WidgetId, h: WidgetHeight) => void
  onSetChartType: (id: WidgetId, chartType: string) => void
  onHide: (id: WidgetId) => void
}

interface DashboardGridProps extends WidgetActions {
  widgets: WidgetLayoutItem[]
  isEditing: boolean
  lastAddedId: WidgetId | null
  onReorder: (activeId: WidgetId, overId: WidgetId) => void
  onFocused: (id: WidgetId) => void
}

export function DashboardGrid({
  widgets,
  isEditing,
  lastAddedId,
  onReorder,
  onFocused,
  onSetWidth,
  onSetHeight,
  onSetChartType,
  onHide
}: DashboardGridProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [activeId, setActiveId] = useState<WidgetId | null>(null)

  const rendered = widgets.filter((item) => getWidgetDefinition(item.id))
  const ids = rendered.map((item) => item.id)
  const activeItem = activeId ? (rendered.find((i) => i.id === activeId) ?? null) : null

  const actions: WidgetActions = { onSetWidth, onSetHeight, onSetChartType, onHide }

  const handleDragStart = (event: DragStartEvent): void => setActiveId(event.active.id as WidgetId)
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (over && active.id !== over.id) onReorder(active.id as WidgetId, over.id as WidgetId)
    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div
          className="grid grid-cols-1 items-start gap-x-6 md:grid-cols-2 md:grid-flow-row-dense xl:grid-cols-4"
          style={{ gridAutoRows: `${ROW_UNIT}px` }}
        >
          {rendered.map((item) => (
            <SortableWidget
              key={item.id}
              item={item}
              isEditing={isEditing}
              isFocusTarget={lastAddedId === item.id}
              onFocused={onFocused}
              actions={actions}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeItem ? <WidgetCard item={activeItem} isEditing={isEditing} isDragging actions={actions} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableWidget({
  item,
  isEditing,
  isFocusTarget,
  onFocused,
  actions
}: {
  item: WidgetLayoutItem
  isEditing: boolean
  isFocusTarget: boolean
  onFocused: (id: WidgetId) => void
  actions: WidgetActions
}): React.ReactElement | null {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isEditing
  })
  const localRef = useRef<HTMLDivElement | null>(null)
  const [highlight, setHighlight] = useState(false)
  // 内容驱动高度: 测内容真实高 → grid-row span 整数倍量化 (合并到 dnd setNodeRef 同一节点)
  const { setRef: setMasonryRef, span } = useMasonryRowSpan()

  const setRefs = (node: HTMLDivElement | null): void => {
    setNodeRef(node)
    localRef.current = node
    setMasonryRef(node)
  }

  // 新增 widget 聚焦: 滚动到位 + 短暂高亮环, 用后清 lastAddedId 防重复。
  useEffect(() => {
    if (!isFocusTarget || !localRef.current) return
    localRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlight(true)
    const timer = window.setTimeout(() => {
      setHighlight(false)
      onFocused(item.id)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [isFocusTarget, item.id, onFocused])

  if (!getWidgetDefinition(item.id)) return null

  // CSS.Translate (非 CSS.Transform): 只取平移, 丢弃 strategy 的 scaleX/scaleY → 不缩放变形。
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    gridRow: span ? `span ${span}` : undefined
  }

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        widthColSpanClass(item.size.w),
        'motion-safe:transition-[opacity,box-shadow]',
        isDragging && 'z-20 opacity-40',
        highlight && 'rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <WidgetCard
        item={item}
        isEditing={isEditing}
        actions={actions}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// 纯渲染卡片 (sortable 占位 + DragOverlay 浮层共用)。稳定回调 (useCallback 绑 item.id) 传给
// 各 widget 组件, 配合 widget 自身 React.memo, 使拖拽期重渲染不穿透到图表。
function WidgetCard({
  item,
  isEditing,
  isDragging = false,
  actions,
  dragHandleProps
}: {
  item: WidgetLayoutItem
  isEditing: boolean
  isDragging?: boolean
  actions: WidgetActions
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
}): React.ReactElement | null {
  const { t } = useTranslation()
  const def = getWidgetDefinition(item.id)
  const meta = WIDGET_CATALOG[item.id]
  const { onSetWidth, onSetHeight, onSetChartType, onHide } = actions
  const handleSetWidth = useCallback((w: WidgetWidth) => onSetWidth(item.id, w), [onSetWidth, item.id])
  const handleSetHeight = useCallback((h: WidgetHeight) => onSetHeight(item.id, h), [onSetHeight, item.id])
  const handleChartType = useCallback((c: string) => onSetChartType(item.id, c), [onSetChartType, item.id])
  const handleHide = useCallback(() => onHide(item.id), [onHide, item.id])

  if (!def) return null
  const Component = def.component
  return (
    <WidgetShell
      title={t(def.titleKey)}
      isEditing={isEditing}
      isDragging={isDragging}
      w={item.size.w}
      h={item.size.h}
      widths={meta.widths}
      heights={meta.heights}
      onSetWidth={handleSetWidth}
      onSetHeight={handleSetHeight}
      onHide={handleHide}
      dragHandleProps={dragHandleProps}
    >
      <Component w={item.size.w} h={item.size.h} chartType={item.chartType} onChartTypeChange={handleChartType} />
    </WidgetShell>
  )
}
