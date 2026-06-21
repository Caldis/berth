import type { HTMLAttributes, ReactNode } from 'react'
import { GripVertical, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetSize } from './widget-types'

// GH-138: 无边框语义容器 (克制编辑感)。默认仅一个安静的 uppercase 标签 + 内容, 靠留白分区;
// affordance (拖拽柄/尺寸循环/隐藏) 悬停或编辑态才显。编辑态加外扩虚线环 (绝对定位 overlay)
// 标识可拖拽: 环画在 widget 间已有留白里, 出现与否不改内容布局 (不再用 p-3 把内容向内挤)。
// 表现焊死在组件内, 不暴露改外观的 className 逃生舱 (ARCHITECTURE 规则 6)。

interface WidgetShellProps {
  title: string
  isEditing?: boolean
  isDragging?: boolean
  size?: WidgetSize
  sizes?: WidgetSize[]
  onSetSize?: (size: WidgetSize) => void
  onHide?: () => void
  /** dnd-kit useSortable 的 attributes+listeners, 绑到拖拽柄。 */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  children: ReactNode
}

export function WidgetShell({
  title,
  isEditing = false,
  isDragging = false,
  size,
  sizes,
  onSetSize,
  onHide,
  dragHandleProps,
  children
}: WidgetShellProps): React.ReactElement {
  return (
    <section
      className={cn(
        'group/widget relative flex h-full min-w-0 flex-col gap-2.5 rounded-lg transition-shadow',
        // 拖拽中: 实心抬起面 + 阴影 (替代淡出, 更有"拿起"手感)
        isDragging && 'p-3 bg-card shadow-xl ring-1 ring-border'
      )}
    >
      {/* 编辑态虚线环: 绝对定位外扩到 widget 间距留白, 脱离文档流 → 出现与否不挤压内容布局 */}
      {isEditing && !isDragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-xl ring-1 ring-dashed ring-border"
        />
      )}
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
            isEditing ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover/widget:pointer-events-auto group-hover/widget:opacity-100'
          )}
        >
          {onSetSize && sizes && sizes.length > 1 && (
            // 枚举式尺寸选择 (一眼看全所有尺寸, 一次点击命中目标, 不轮换试错)
            <div role="group" aria-label="Widget size" className="inline-flex items-center gap-0.5 rounded-md bg-muted/50 p-0.5">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSetSize(s)}
                  aria-label={`Size ${s}`}
                  aria-pressed={s === size}
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    s === size ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
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
