import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  message: string
  className?: string
}

export function EmptyState({ icon: Icon, message, className }: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16',
        className
      )}
    >
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
