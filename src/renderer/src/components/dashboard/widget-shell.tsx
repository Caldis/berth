import type { HTMLAttributes, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GripVertical, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SegmentedTabs } from '@/components/ui'
import type { WidgetWidth } from './widget-types'

// GH-138 / GH-150: 无边框语义容器 (克制编辑感)。默认仅一个安静的 uppercase 标签 + 内容, 靠留白分区;
// affordance (拖拽柄/宽度档切换/隐藏) 悬停或编辑态才显。编辑态加外扩虚线环 (绝对定位 overlay)
// 标识可拖拽; 拖拽态 (DragOverlay 浮层) 加实心抬起面 + 阴影。尺寸仅宽度档一分段控件 (GH-150 去高度档)。
// 表现焊死在组件内, 不暴露改外观的 className 逃生舱 (ARCHITECTURE 规则 6)。

const WIDTH_LABEL: Record<WidgetWidth, string> = { W1: '1', W2: '2', W4: '4' }

interface WidgetShellProps {
  title: string
  isEditing?: boolean
  isDragging?: boolean
  w: WidgetWidth
  widths: WidgetWidth[]
  onSetWidth?: (w: WidgetWidth) => void
  onHide?: () => void
  /** dnd-kit useSortable 的 attributes+listeners, 绑到拖拽柄。 */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  children: ReactNode
}

export function WidgetShell({
  title,
  isEditing = false,
  isDragging = false,
  w,
  widths,
  onSetWidth,
  onHide,
  dragHandleProps,
  children
}: WidgetShellProps): React.ReactElement {
  const { t } = useTranslation()
  return (
    <section
      className={cn(
        // 常驻实边框 + 卡面 + 轻阴影浮起 — 明确区分各 widget 边界 (用户 verify 要求可辨识);
        // hover 阴影加深 + 边框变深, 给交互反馈。克制的 subtle card, 非粗重灰板。
        'group/widget relative flex h-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-foreground/15 hover:shadow-md',
        // 编辑态: 边框转虚线提示可拖拽 (替代原外扩虚线环)
        isEditing && !isDragging && 'border-dashed',
        isDragging && 'border-solid border-border shadow-xl ring-1 ring-border'
      )}
    >
      <header className="flex h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {isEditing && (
            <button
              type="button"
              aria-label={`${title} — drag to reorder`}
              className="-ml-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...dragHandleProps}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <h3 className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </h3>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 transition-opacity',
            isEditing
              ? 'opacity-100'
              : 'pointer-events-none opacity-0 group-hover/widget:pointer-events-auto group-hover/widget:opacity-100'
          )}
        >
          {onSetWidth && widths.length > 1 && (
            // 宽度档: 1/2/4 列, 一眼看全, 一次点击命中
            <SegmentedTabs
              ariaLabel={t('overview.dashboard.size.width')}
              items={widths.map((x) => ({ key: x, label: WIDTH_LABEL[x] }))}
              selectedKey={w}
              onSelectionChange={onSetWidth}
            />
          )}
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              aria-label="Hide widget"
              title="Hide"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>
      <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
    </section>
  )
}
