import { Check, ChevronDown } from 'lucide-react'
import { FloatingPopover } from '@/components/shared/floating-popover'
import { cn } from '@/lib/utils'

// 侧栏全局筛选器 (项目范围 / agent 范围) 的共享外壳: 统一 trigger
// (图标 + 当前值 + 过滤生效指示点 + chevron) 与 click 式 FloatingPopover
// 面板 (外点/Escape 关闭、焦点归还、option 间方向键漫游)。
// 两个切换器此前各自手写 trigger+absolute popover, 交互契约在此收敛单源。

interface ScopePopoverProps {
  collapsed: boolean
  /** Trigger icon (sized by caller, typically h-3.5 w-3.5). */
  icon: React.ReactNode
  /** Dimension name (aria-label; tooltip when collapsed). */
  label: string
  /** Current selection text shown on the trigger. */
  value: string
  /** Tooltip for the expanded trigger; falls back to value. */
  description?: string
  /** Non-default filter in effect — highlights the trigger so the filtered
   * view is never mistaken for the complete one ("看不到=没有"). */
  active: boolean
  /** aria-label of the option list. */
  listLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  panelClassName?: string
  /** Rendered above the option list, outside role=listbox (title, filter input). */
  header?: React.ReactNode
  /** Rendered below the option list, outside role=listbox (detail sections). */
  footer?: React.ReactNode
  children: React.ReactNode
}

export function ScopePopover({
  collapsed,
  icon,
  label,
  value,
  description,
  active,
  listLabel,
  open,
  onOpenChange,
  panelClassName,
  header,
  footer,
  children
}: ScopePopoverProps): React.ReactElement {
  return (
    <FloatingPopover
      interaction="click"
      open={open}
      onOpenChange={onOpenChange}
      side={collapsed ? 'right' : 'bottom'}
      align="start"
      sideOffset={collapsed ? 8 : 4}
      trigger={
        <button
          type="button"
          className={cn(
            'titlebar-no-drag flex h-8 w-full min-w-0 items-center gap-2 rounded-md transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring',
            active ? 'text-sidebar-foreground' : 'text-muted-foreground',
            collapsed ? 'w-8 justify-center' : 'justify-start px-2.5'
          )}
          title={collapsed ? label : description ?? value}
          aria-label={label}
          aria-haspopup="listbox"
        >
          <span className="relative shrink-0">
            {icon}
            {active && collapsed && (
              <span
                data-scope-active-dot
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary"
              />
            )}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{value}</span>
              {active && (
                <span
                  data-scope-active-dot
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
              )}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform',
                  open && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
      }
    >
      <div
        className={cn('max-h-[calc(100vh-7rem)] overflow-y-auto p-2', panelClassName)}
        onKeyDown={handleOptionNavigation}
      >
        {header}
        <div role="listbox" aria-label={listLabel} className="grid gap-1">
          {children}
        </div>
        {footer}
      </div>
    </FloatingPopover>
  )
}

/** Roving focus across [role=option] rows. Bound at panel level so ArrowUp/Down
 * also work from a filter input in the header; Home/End stay untouched outside
 * options to preserve the text-cursor behavior of inputs. */
function handleOptionNavigation(event: React.KeyboardEvent<HTMLDivElement>): void {
  const { key } = event
  if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return
  const target = event.target as HTMLElement
  const onOption = target.getAttribute('role') === 'option'
  if ((key === 'Home' || key === 'End') && !onOption) return
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
  )
  if (options.length === 0) return
  event.preventDefault()
  const current = options.indexOf(target)
  let next: number
  if (key === 'Home') next = 0
  else if (key === 'End') next = options.length - 1
  else if (key === 'ArrowDown') next = current < 0 ? 0 : Math.min(current + 1, options.length - 1)
  else next = current < 0 ? options.length - 1 : Math.max(current - 1, 0)
  options[next]?.focus()
}

interface ScopeOptionProps {
  icon: React.ReactNode
  title: string
  description?: string
  /** Extra meta content under the description (e.g. project source counts). */
  meta?: React.ReactNode
  selected: boolean
  onClick: () => void
}

export function ScopeOption({
  icon,
  title,
  description,
  meta,
  selected,
  onClick
}: ScopeOptionProps): React.ReactElement {
  const multiline = Boolean(description || meta)
  return (
    <button
      type="button"
      role="option"
      aria-label={title}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'flex w-full min-w-0 gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        multiline ? 'items-start' : 'items-center',
        selected && 'bg-muted text-foreground'
      )}
    >
      <span className={cn('shrink-0 text-muted-foreground', multiline && 'mt-0.5')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={title}>
          {title}
        </span>
        {description && (
          <span className="block truncate text-xs text-muted-foreground" title={description}>
            {description}
          </span>
        )}
        {meta}
      </span>
      {selected && (
        <Check className={cn('h-3.5 w-3.5 shrink-0 text-primary', multiline && 'mt-0.5')} />
      )}
    </button>
  )
}
