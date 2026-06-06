import { useTranslation } from 'react-i18next'
import { Alert, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  fullHeight?: boolean
}

/**
 * Distinct load-failure state (GH-110 P4.3) — keeps "failed to load" visually
 * separate from "no data" (EmptyState). Built on the HeroUI Alert + Button
 * primitives (no hand-rolled controls) with an optional retry action.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  className,
  fullHeight = false
}: ErrorStateProps): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div
      className={cn('flex', fullHeight ? 'min-h-[320px] items-center justify-center' : '', className)}
      role="alert"
    >
      <Alert
        color="danger"
        variant="faded"
        title={title}
        description={description}
        className="w-full"
        endContent={
          onRetry ? (
            <Button size="sm" variant="flat" color="danger" onPress={onRetry}>
              {retryLabel ?? t('common.retry')}
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
