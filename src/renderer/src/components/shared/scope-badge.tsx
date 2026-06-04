import { useTranslation } from 'react-i18next'
import { Chip } from '@/components/ui'
import type { AssetScope } from '@shared/types/asset'

interface ScopeBadgeProps {
  scope: AssetScope
  className?: string
}

// Neutral scope pill, now built on the shared semantic Chip (GH-105). Scopes
// stay deliberately neutral (no category hues) — tone="neutral" maps to the
// theme's default color so it follows dark/light without hardcoded values.
export function ScopeBadge({ scope, className }: ScopeBadgeProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <Chip tone="neutral" variant="flat" size="sm" className={className}>
      {t(`common.scope.${scope}`)}
    </Chip>
  )
}
