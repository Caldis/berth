import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { AssetScope } from '@shared/types/asset'

const scopeColors: Record<AssetScope, string> = {
  user: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  project: 'bg-green-500/10 text-green-600 dark:text-green-400',
  enterprise: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  session: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300'
}

interface ScopeBadgeProps {
  scope: AssetScope
  className?: string
}

export function ScopeBadge({ scope, className }: ScopeBadgeProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        scopeColors[scope],
        className
      )}
    >
      {t(`common.scope.${scope}`)}
    </span>
  )
}
