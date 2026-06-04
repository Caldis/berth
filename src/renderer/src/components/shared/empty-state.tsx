import { cn } from '@/lib/utils'

/**
 * Min-height of the page content area below the (floating) top navigation.
 * CSS vars are resolved lazily at the using node: `--berth-page-top-offset`
 * is inherited from <main>, `--berth-page-gutter` from :root (globals.css).
 * Use on a page-root flex wrapper so a `fullHeight` EmptyState can fill it.
 */
export const PAGE_EMPTY_FILL =
  'min-h-[calc(100dvh-var(--berth-page-top-offset)-var(--berth-page-gutter))]'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  message?: string
  title?: string
  description?: string
  action?: React.ReactNode
  /** Fill the parent flex column / definite-height box and center the placeholder. */
  fullHeight?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  message,
  title,
  description,
  action,
  fullHeight = false,
  className
}: EmptyStateProps): React.ReactElement {
  const heading = title ?? message

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center',
        fullHeight && 'h-full w-full flex-1',
        className
      )}
    >
      <div className="relative mb-4 flex h-20 w-24 items-center justify-center" aria-hidden="true">
        <div className="absolute inset-x-3 bottom-2 h-12 rounded-lg border border-border bg-background shadow-sm" />
        <div className="absolute inset-x-6 bottom-6 h-2 rounded-full bg-muted" />
        <div className="absolute left-8 right-10 bottom-10 h-2 rounded-full bg-muted/70" />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {heading && <p className="text-sm font-medium text-muted-foreground">{heading}</p>}
      {description && <p className="mt-1 max-w-[48ch] text-center text-xs leading-5 text-muted-foreground/75">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
