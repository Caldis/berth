import { cn } from '@/lib/utils'

interface StatCardProps {
  value: number | string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  color?: string
  delay?: number
}

export function StatCard({
  value,
  label,
  icon: Icon,
  onClick,
  color = 'text-primary',
  delay = 0
}: StatCardProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-accent/5 hover:shadow-sm',
        'animate-in fade-in slide-in-from-bottom-2',
        onClick && 'cursor-pointer'
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl font-bold tracking-tight text-card-foreground">{value}</span>
        <Icon
          className={cn(
            'h-5 w-5 transition-transform group-hover:scale-110',
            color
          )}
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </button>
  )
}
