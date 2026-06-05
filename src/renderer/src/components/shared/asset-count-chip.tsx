import type { LucideIcon } from 'lucide-react'
import { Chip } from '@/components/ui'
import { cn } from '@/lib/utils'

interface AssetCountChipProps {
  icon: LucideIcon
  /** Tailwind color class for the icon (e.g. text-blue-500), matching session detail semantics. */
  iconClassName?: string
  count: number
  /** Full asset names; surfaced (truncated to `max`) via title/aria-label. */
  names: string[]
  /** Human label for the asset class, e.g. "Skills" / "MCP". */
  label: string
  max?: number
  className?: string
}

/**
 * Dense count pill for a class of session assets (skills / MCP servers) in the
 * session list row (GH-108). Shows just the count with a semantic icon; the full
 * (top-`max`) name list rides on title/aria-label rather than a Tooltip so it
 * stays measurable and accessible inside the row's `<button>`. Renders nothing
 * when there is nothing to show (`count <= 0`), so empty asset sets never occupy
 * row space.
 */
export function AssetCountChip({
  icon: Icon,
  iconClassName,
  count,
  names,
  label,
  max = 3,
  className
}: AssetCountChipProps): React.ReactElement | null {
  if (count <= 0) return null

  const shown = names.slice(0, max)
  const overflow = names.length - shown.length
  const detail = `${label}: ${shown.join(', ')}${overflow > 0 ? ` +${overflow}` : ''}`

  return (
    <Chip
      tone="neutral"
      variant="flat"
      size="sm"
      title={detail}
      aria-label={detail}
      className={className}
      startContent={<Icon className={cn('h-3 w-3 shrink-0', iconClassName)} aria-hidden="true" />}
    >
      {count}
    </Chip>
  )
}
