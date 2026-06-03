import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  rows?: number
  compact?: boolean
  className?: string
}

export function LoadingState({
  title,
  description,
  icon: Icon,
  rows = 4,
  compact = false,
  className
}: LoadingStateProps): React.ReactElement {
  const RowIcon = Icon ?? Loader2

  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card',
        compact ? 'p-4' : 'p-5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <RowIcon className={cn('h-4 w-4', Icon ? 'motion-safe:animate-pulse' : 'motion-safe:animate-spin')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-card-foreground">{title}</p>
          {description && (
            <p className="mt-1 max-w-[56ch] text-xs leading-5 text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className={cn('mt-5 space-y-3', compact && 'mt-4 space-y-2.5')} aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className={cn(
                'h-8 w-8 shrink-0 rounded-md bg-muted/70 motion-safe:animate-pulse',
                compact && 'h-7 w-7'
              )}
              style={{ animationDelay: `${index * 80}ms` }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div
                className="h-2.5 rounded-full bg-muted motion-safe:animate-pulse"
                style={{ width: `${82 - (index % 3) * 12}%`, animationDelay: `${index * 90}ms` }}
              />
              <div
                className="h-2 rounded-full bg-muted/60 motion-safe:animate-pulse"
                style={{ width: `${48 + (index % 2) * 14}%`, animationDelay: `${index * 110}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
