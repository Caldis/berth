import { useCallback, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Puzzle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Chip } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PluginOriginBadgeProps {
  pluginId: string
  pluginName?: string
  className?: string
}

/**
 * "From plugin X" badge shown on plugin-provided components (GH-112). Clickable:
 * jumps to the plugins page and focuses/expands the owning plugin via the shared
 * focus contract. The button is the interactive element (keyboard-accessible);
 * the Chip is purely visual. stopPropagation keeps clicks from toggling the
 * surrounding (expandable) asset card.
 */
export function PluginOriginBadge({ pluginId, pluginName, className }: PluginOriginBadgeProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const name = pluginName && pluginName.trim().length > 0 ? pluginName : pluginId

  const handleJump = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      navigate('/capabilities/plugins', { state: { focusAssetId: pluginId } })
    },
    [navigate, pluginId]
  )

  return (
    <button
      type="button"
      data-testid={`plugin-origin-badge-${pluginId}`}
      aria-label={t('plugins.viewPlugin', { name })}
      onClick={handleJump}
      className={cn(
        'inline-flex shrink-0 rounded-full outline-none transition-transform',
        'focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px',
        className
      )}
    >
      <Chip
        tone="neutral"
        size="sm"
        variant="flat"
        radius="full"
        className="pointer-events-none cursor-pointer hover:bg-default-200"
        startContent={<Puzzle aria-hidden="true" className="ml-0.5 h-2.5 w-2.5 text-purple-500" />}
      >
        {t('plugins.fromPlugin', { name })}
      </Chip>
    </button>
  )
}
