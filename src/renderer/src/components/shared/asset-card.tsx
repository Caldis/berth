import { cn } from '@/lib/utils'
import { ScopeBadge } from './scope-badge'
import type { AssetScope } from '@shared/types/asset'

interface AssetCardProps {
  name: string
  type: string
  scope: AssetScope
  meta?: string
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
  className?: string
  warning?: boolean
}

export function AssetCard({
  name,
  type,
  scope,
  meta,
  icon: Icon,
  onClick,
  className,
  warning
}: AssetCardProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent/5',
        warning && 'border-destructive/30',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn('h-4 w-4 shrink-0 text-muted-foreground', warning && 'text-destructive')}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-card-foreground">{name}</span>
          <ScopeBadge scope={scope} />
        </div>
        {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground">{type}</span>
    </button>
  )
}
