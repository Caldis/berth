import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WarningBannerProps {
  title: string
  message: string
  className?: string
}

export function WarningBanner({ title, message, className }: WarningBannerProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="mt-0.5 text-sm text-destructive/80">{message}</p>
      </div>
    </div>
  )
}
