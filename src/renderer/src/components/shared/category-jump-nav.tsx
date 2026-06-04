import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { cn } from '@/lib/utils'
import type { JumpNavItem } from '@/lib/virtual-list-model'

interface CategoryJumpNavProps {
  items: readonly JumpNavItem[]
  activeId?: string
  onSelect: (id: string) => void
  label?: string
  className?: string
  testId?: string
}

function formatItemLabel(item: JumpNavItem): string {
  return `${item.label}, ${item.count} items`
}

export function CategoryJumpNav({
  items,
  activeId,
  onSelect,
  label = 'List categories',
  className,
  testId = 'category-jump-nav'
}: CategoryJumpNavProps): React.ReactElement | null {
  if (items.length === 0) return null

  return (
    <NavigationMenu.Root
      aria-label={label}
      orientation="vertical"
      data-testid={testId}
      className={cn(
        'overflow-x-auto pb-2 lg:sticky lg:top-[var(--berth-page-top-offset,6rem)] lg:h-[calc(100dvh_-_var(--berth-page-top-offset,6rem))] lg:max-h-[calc(100dvh_-_var(--berth-page-top-offset,6rem))] lg:w-44 lg:shrink-0 lg:self-start lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0',
        className
      )}
    >
      <NavigationMenu.List
        data-testid={`${testId}-list`}
        className="flex min-w-max gap-1 lg:w-full lg:min-w-0 lg:flex-col"
      >
        {items.map((item) => {
          if (item.kind === 'heading') {
            return (
              <NavigationMenu.Item key={item.id}>
                <div
                  title={item.title}
                  className="flex h-6 min-w-24 items-center border-border/70 px-2.5 text-[10px] font-semibold tracking-wide text-muted-foreground/55 lg:mt-3 lg:h-auto lg:min-w-0 lg:border-t lg:px-2.5 lg:pb-1 lg:pt-2 first:lg:mt-0 first:lg:border-t-0"
                >
                  <span className="truncate">{item.label}</span>
                </div>
              </NavigationMenu.Item>
            )
          }

          const active = item.id === activeId
          return (
            <NavigationMenu.Item key={item.id}>
              <button
                type="button"
                aria-label={formatItemLabel(item)}
                aria-current={active ? 'page' : undefined}
                title={item.title}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex h-8 w-full min-w-28 items-center justify-between gap-2 rounded-md border px-2.5 text-left text-xs font-medium outline-none transition-colors',
                  'focus-visible:ring-1 focus-visible:ring-ring lg:min-w-0',
                  item.parentId ? 'lg:pl-4' : undefined,
                  active
                    ? 'border-border bg-muted text-foreground shadow-sm'
                    : 'border-transparent bg-transparent text-foreground/75 hover:border-border hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <span className="truncate">{item.label}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    active ? 'bg-background text-foreground' : 'bg-muted/70 text-muted-foreground'
                  )}
                >
                  {item.count}
                </span>
              </button>
            </NavigationMenu.Item>
          )
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}
