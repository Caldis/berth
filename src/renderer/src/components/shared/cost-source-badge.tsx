import { useTranslation } from 'react-i18next'
import type { CostSource } from '@shared/types/asset'
import { Chip, type ChipTone } from '@/components/ui'

interface CostSourceBadgeProps {
  source: CostSource
  className?: string
}

// Semantic tone per source — replaces the former hardcoded emerald/sky/amber
// tints so the badge follows the theme + switchable accent (GH-105 AC6).
const SOURCE_TONE: Record<CostSource, ChipTone> = {
  actual: 'success',
  estimated: 'neutral',
  mixed: 'warning',
  unknown: 'neutral'
}

export function CostSourceBadge({ source, className }: CostSourceBadgeProps): React.ReactElement {
  const { t } = useTranslation()
  const label = t(`usage.costSource.${source}`)
  const description = t(`usage.costSourceDescription.${source}`)

  return (
    <Chip
      tone={SOURCE_TONE[source]}
      variant="flat"
      size="sm"
      aria-label={`${label}: ${description}`}
      title={description}
      className={className}
    >
      {label}
    </Chip>
  )
}
