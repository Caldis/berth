import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeTone = 'info' | 'warning' | 'error'

interface NoticePanelProps {
  tone?: NoticeTone
  title: string
  message?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const toneClass: Record<NoticeTone, string> = {
  info: 'border-border bg-muted/30 text-foreground',
  warning: 'border-amber-500/25 bg-amber-500/10 text-foreground',
  error: 'border-destructive/50 bg-destructive/5 text-foreground'
}

const iconClass: Record<NoticeTone, string> = {
  info: 'text-muted-foreground',
  warning: 'text-amber-700 dark:text-amber-300',
  error: 'text-destructive'
}

export function NoticePanel({
  tone = 'info',
  title,
  message,
  icon: Icon = tone === 'info' ? Info : AlertTriangle,
  action,
  children,
  className
}: NoticePanelProps): React.ReactElement {
  return (
    <div className={cn('rounded-lg border px-4 py-3', toneClass[tone], className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass[tone])} />
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', tone === 'error' && 'text-destructive')}>
              {title}
            </p>
            {message && (
              <p className={cn('mt-0.5 text-sm text-muted-foreground', tone === 'error' && 'text-destructive/80')}>
                {message}
              </p>
            )}
            {children}
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}
