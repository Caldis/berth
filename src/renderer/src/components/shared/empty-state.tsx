import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  message?: string
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  message,
  title,
  description,
  action,
  className
}: EmptyStateProps): React.ReactElement {
  const heading = title ?? message

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16',
        className
      )}
    >
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      {heading && <p className="text-sm font-medium text-muted-foreground">{heading}</p>}
      {description && <p className="mt-1 max-w-[48ch] text-center text-xs leading-5 text-muted-foreground/75">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
