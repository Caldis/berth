import { type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GripVertical, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SegmentedTabs } from '@/components/ui'
import type { WidgetWidth } from './widget-types'
import { useResizeHandle } from './use-resize-handle'

// GH-138 / GH-150 R2: 无边框语义容器 (克制编辑感)。编辑态: 拖拽柄 + 宽度档切换 + 底边高度 resize 手柄。
// 宽度走档切换器 (离散响应式), 高度走 resize 手柄 (连续行 span)。表现焊死组件内 (ARCHITECTURE 规则6)。

const WIDTH_LABEL: Record<WidgetWidth, string> = { W1: '1', W2: '2', W4: '4' }

// 每个 h span 的像素高 (= dashboard-grid grid-auto-rows 88 + row gap 24); 拖拽量化用。
const PX_PER_SPAN = 112

interface WidgetShellProps {
  title: string
  isEditing?: boolean
  isDragging?: boolean
  w: WidgetWidth
  widths: WidgetWidth[]
  onSetWidth?: (w: WidgetWidth) => void
  h?: number
  minH?: number
  maxH?: number
  onSetHeight?: (h: number) => void
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
  h,
  minH,
  maxH,
  onSetHeight,
  onHide,
  dragHandleProps,
  children
}: WidgetShellProps): React.ReactElement {
  const { t } = useTranslation()
  const curH = h ?? minH ?? 1
  const lo = minH ?? 1
  const hi = maxH ?? curH
  const canResize = isEditing && !!onSetHeight && hi > lo
  const { resizing, handlers } = useResizeHandle({
    h: curH,
    minH: lo,
    maxH: hi,
    pxPerSpan: PX_PER_SPAN,
    onChange: onSetHeight ?? (() => {})
  })

  return (
    <section
      className={cn(
        // 卡面 + 轻阴影浮起; hover 加深。克制 subtle card, 非粗重灰板。
        'group/widget relative flex h-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-foreground/15 hover:shadow-md',
        isEditing && !isDragging && 'border-dashed',
        (isDragging || resizing) && 'border-solid border-border shadow-xl ring-1 ring-border'
      )}
    >
      <header className="flex h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center">
          {/* 拖拽柄: 编辑态宽度展开 + 淡入; 非编辑态宽 0 不占位。 */}
          <motion.div
            initial={false}
            animate={{ width: isEditing ? 18 : 0, marginRight: isEditing ? 6 : 0, opacity: isEditing ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
            className="-ml-0.5 flex shrink-0 items-center overflow-hidden"
          >
            <button
              type="button"
              aria-label={`${title} — drag to reorder`}
              className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/70 transition-colors hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...dragHandleProps}
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0" />
            </button>
          </motion.div>
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
      {/* grid + grid-rows-1: 单格 1fr 拉伸子节点撑满内容区高度 (h-full 在 flex-grow 父上不解析, grid stretch 可靠) */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-1 overflow-hidden">{children}</div>
      {canResize && (
        // 高度 resize 手柄: 底边细条, 编辑态 hover 显; 拖拽量化改 h span。
        <div
          {...handlers}
          role="slider"
          aria-label={t('overview.dashboard.size.height')}
          aria-valuenow={curH}
          aria-valuemin={lo}
          aria-valuemax={hi}
          className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize touch-none items-end justify-center pb-0.5 opacity-0 transition-opacity group-hover/widget:opacity-100"
        >
          <span className={cn('h-1 w-8 rounded-full transition-colors', resizing ? 'bg-primary' : 'bg-border')} />
        </div>
      )}
    </section>
  )
}
