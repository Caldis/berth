import { useTranslation } from 'react-i18next'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { WidgetShell } from './widget-shell'
import { getWidgetDefinition } from './widget-registry'
import { WIDGET_CATALOG } from './widget-catalog'
import type { WidgetId, WidgetSize } from './widget-types'
import type { WidgetLayoutItem } from '@/lib/dashboard-layout'

// GH-138: 导轨式仪表盘网格 — 响应式 CSS Grid + 尺寸预设跨度; dnd-kit sortable 重排 (仅编辑态)。
// 尺寸→跨度用字面类名 (Tailwind JIT 不识别插值)。未注册的 widget 优雅跳过。

// 尺寸跨度 = 列跨 (内容决定高度, 不强制行高以免短组件被撑空)。M/L 的高度区分由 widget 内容
// 驱动 (列表类 widget 在 L 显示更多条目, 自然更高更有用)。grid-flow-dense 回填空隙 (U7)。
const SIZE_CLASS: Record<WidgetSize, string> = {
  S: 'col-span-1',
  M: 'col-span-1 md:col-span-1 xl:col-span-2',
  L: 'col-span-1 md:col-span-2 xl:col-span-2',
  Wide: 'col-span-1 md:col-span-2 xl:col-span-4',
  XL: 'col-span-1 md:col-span-2 xl:col-span-4'
}

interface DashboardGridProps {
  widgets: WidgetLayoutItem[]
  isEditing: boolean
  onReorder: (activeId: WidgetId, overId: WidgetId) => void
  onSetSize: (id: WidgetId, size: WidgetSize) => void
  onSetChartType: (id: WidgetId, chartType: string) => void
  onHide: (id: WidgetId) => void
}

export function DashboardGrid({
  widgets,
  isEditing,
  onReorder,
  onSetSize,
  onSetChartType,
  onHide
}: DashboardGridProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const rendered = widgets.filter((item) => getWidgetDefinition(item.id))
  const ids = rendered.map((item) => item.id)

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorder(active.id as WidgetId, over.id as WidgetId)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-7 md:grid-cols-2 md:grid-flow-row-dense xl:grid-cols-4">
          {rendered.map((item, index) => (
            <SortableWidget
              key={item.id}
              item={item}
              index={index}
              isEditing={isEditing}
              onSetSize={onSetSize}
              onSetChartType={onSetChartType}
              onHide={onHide}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableWidget({
  item,
  index,
  isEditing,
  onSetSize,
  onSetChartType,
  onHide
}: {
  item: WidgetLayoutItem
  index: number
  isEditing: boolean
  onSetSize: (id: WidgetId, size: WidgetSize) => void
  onSetChartType: (id: WidgetId, chartType: string) => void
  onHide: (id: WidgetId) => void
}): React.ReactElement | null {
  const { t } = useTranslation()
  const def = getWidgetDefinition(item.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isEditing
  })

  if (!def) return null
  const Component = def.component
  // 入场 stagger: CSS animate-in (不碰 transform, 与 dnd 不冲突), 仅首挂载/新增时跑;
  // animationDelay 阶梯 (上限 8 格), motion-safe 门控 reduced-motion。
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${Math.min(index, 8) * 45}ms`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        SIZE_CLASS[item.size],
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500',
        isDragging && 'z-20'
      )}
    >
      <WidgetShell
        title={t(def.titleKey)}
        isEditing={isEditing}
        isDragging={isDragging}
        size={item.size}
        sizes={WIDGET_CATALOG[item.id].sizes}
        onSetSize={(s) => onSetSize(item.id, s)}
        onHide={() => onHide(item.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        <Component
          size={item.size}
          chartType={item.chartType}
          onChartTypeChange={(c) => onSetChartType(item.id, c)}
        />
      </WidgetShell>
    </div>
  )
}
