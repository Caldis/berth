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
import { LayoutGroup, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_CSS, LAYOUT_GLIDE, MOTION } from '@/components/ui'
import { WidgetShell } from './widget-shell'
import { getWidgetDefinition } from './widget-registry'
import { WIDGET_CATALOG } from './widget-catalog'
import type { WidgetId, WidgetWidth } from './widget-types'
import type { WidgetLayoutItem } from '@/lib/dashboard-layout'
import { widthColSpanClass, gridRowSpanStyle } from '@/lib/widget-grid'

// GH-138 / GH-150: 仪表盘网格 — CSS Grid (规整列跨 + 同行 align-stretch 等高) 定位置, framer-motion
// layout 让非拖拽布局变化 (size 切换 / 重排 / 增删 / 内容高变) 都 transition 而非瞬移。同行等高: 同一
// 行卡片拉到该行最高卡 (矮卡底部留白), 消除内容驱动的高度错落 (用户定: 等高 > 贴合零留白)。
// 拖拽 (仅编辑态): dnd-kit sortable + DragOverlay 浮层克隆 — 拖拽中关 framer layout, 用 dnd transform
// 实时让位 (杜绝双 transform 源打架); 非拖拽开 layout 做 FLIP。各 widget 自身 memo, 重排只动 transform。

interface WidgetActions {
  onSetWidth: (id: WidgetId, w: WidgetWidth) => void
  onSetHeight: (id: WidgetId, h: number) => void
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
        <LayoutGroup>
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
            style={{ gridAutoRows: 'var(--ov-row-unit, 28px)', gridAutoFlow: 'row dense' }}
          >
            {rendered.map((item) => (
              <SortableWidget
                key={item.id}
                item={item}
                isEditing={isEditing}
                isAnyDragging={activeId !== null}
                isFocusTarget={lastAddedId === item.id}
                onFocused={onFocused}
                actions={actions}
              />
            ))}
          </div>
        </LayoutGroup>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: MOTION.durationMs.base, easing: EASE_CSS.standard }}>
        {activeItem ? <WidgetCard item={activeItem} isEditing={isEditing} isDragging actions={actions} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableWidget({
  item,
  isEditing,
  isAnyDragging,
  isFocusTarget,
  onFocused,
  actions
}: {
  item: WidgetLayoutItem
  isEditing: boolean
  isAnyDragging: boolean
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

  const setRefs = (node: HTMLDivElement | null): void => {
    setNodeRef(node)
    localRef.current = node
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

  // 拖拽中: 挂 dnd transform 让位 (CSS.Translate 丢 scale), 关 framer layout 避免双 transform 源;
  // 非拖拽: framer layout 接管 (size 切换 / 重排 / 增删 FLIP), 不挂 dnd transform。
  // gridRow span 定高 (dashboard 引擎); 拖拽态叠加 dnd transform 让位。
  const style: CSSProperties = {
    ...gridRowSpanStyle(item.size.h),
    ...(isAnyDragging ? { transform: CSS.Translate.toString(transform), transition } : {})
  }

  return (
    <motion.div
      ref={setRefs}
      layout={!isAnyDragging}
      transition={{ layout: LAYOUT_GLIDE }}
      style={style}
      className={cn(
        widthColSpanClass(item.size.w),
        // h-full: 撑满 grid cell (同行 align-stretch 给的行高) → 同行卡片等高
        'h-full motion-safe:transition-[opacity]',
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
    </motion.div>
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
  const handleSetHeight = useCallback((h: number) => onSetHeight(item.id, h), [onSetHeight, item.id])
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
      widths={meta.widths}
      onSetWidth={handleSetWidth}
      h={item.size.h}
      minH={meta.minH}
      maxH={meta.maxH}
      onSetHeight={handleSetHeight}
      onHide={handleHide}
      dragHandleProps={dragHandleProps}
    >
      <Component w={item.size.w} h={item.size.h} chartType={item.chartType} onChartTypeChange={handleChartType} />
    </WidgetShell>
  )
}
