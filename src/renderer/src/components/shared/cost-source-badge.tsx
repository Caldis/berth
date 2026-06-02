import { useTranslation } from 'react-i18next'
import type { CostSource } from '@shared/types/asset'
import { cn } from '@/lib/utils'

interface CostSourceBadgeProps {
  source: CostSource
  className?: string
}

const SOURCE_CLASS: Record<CostSource, string> = {
  actual: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  estimated: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  mixed: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  unknown: 'border-border bg-muted text-muted-foreground'
}

export function CostSourceBadge({ source, className }: CostSourceBadgeProps): React.ReactElement {
  const { t } = useTranslation()
  const label = t(`usage.costSource.${source}`)
  const description = t(`usage.costSourceDescription.${source}`)

  return (
    <span
      aria-label={`${label}: ${description}`}
      title={description}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none',
        SOURCE_CLASS[source],
        className
      )}
    >
      {label}
    </span>
  )
}
