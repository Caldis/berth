import { cn } from '@/lib/utils'

interface DetailRowProps {
  label: string
  value: React.ReactNode
  className?: string
  mono?: boolean
}

export function DetailRow({ label, value, className, mono }: DetailRowProps): React.ReactElement {
  return (
    <div className={cn('flex items-baseline gap-2 py-1 text-sm', className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 break-all text-foreground', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}
