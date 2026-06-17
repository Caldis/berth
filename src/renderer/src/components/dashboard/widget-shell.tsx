import type { HTMLAttributes, ReactNode } from 'react'
import { GripVertical, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// GH-138: 无边框语义容器 (克制编辑感)。默认仅一个安静的 uppercase 标签 + 内容, 靠留白分区;
// affordance (拖拽柄/尺寸循环/隐藏) 悬停或编辑态才显。编辑态加虚线环标识可拖拽。
// 表现焊死在组件内, 不暴露改外观的 className 逃生舱 (ARCHITECTURE 规则 6)。

interface WidgetShellProps {
  title: string
  isEditing?: boolean
  isDragging?: boolean
  sizeLabel?: string
  onCycleSize?: () => void
  onHide?: () => void
  /** dnd-kit useSortable 的 attributes+listeners, 绑到拖拽柄。 */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  children: ReactNode
}

export function WidgetShell({
  title,
  isEditing = false,
  isDragging = false,
  sizeLabel,
  onCycleSize,
  onHide,
  dragHandleProps,
  children
}: WidgetShellProps): React.ReactElement {
  return (
    <section
      className={cn(
        'group/widget relative flex h-full min-w-0 flex-col gap-2.5 rounded-lg transition-shadow',
        isEditing && !isDragging && 'p-3 ring-1 ring-dashed ring-border',
        // 拖拽中: 实心抬起面 + 阴影 (替代淡出, 更有"拿起"手感)
        isDragging && 'p-3 bg-card shadow-xl ring-1 ring-border'
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
            'flex items-center gap-0.5 transition-opacity',
            isEditing ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover/widget:pointer-events-auto group-hover/widget:opacity-100'
          )}
        >
          {onCycleSize && sizeLabel && (
            <button
              type="button"
              onClick={onCycleSize}
              aria-label={`Resize widget (current ${sizeLabel})`}
              title={`Resize (${sizeLabel})`}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {sizeLabel}
            </button>
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
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  )
}
