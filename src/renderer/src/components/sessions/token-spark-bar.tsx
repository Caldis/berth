import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TokenUsageBreakdown } from '@shared/types/asset'
import { tokenUsageSegments, type TokenUsageSegmentId } from '@shared/token-usage'
import { TOKEN_SEGMENT_COLOR_VAR } from '@/lib/chart-colors'
import { formatNumber, cn } from '@/lib/utils'

interface TokenSparkBarProps {
  usage: TokenUsageBreakdown
  className?: string
}

const SEGMENT_LABEL_KEYS: Record<TokenUsageSegmentId, string> = {
  input: 'usage.inputTokens',
  output: 'usage.outputTokens',
  cache: 'usage.cacheTokens',
  reasoning: 'usage.reasoningTokens',
  unknown: 'usage.unknownTokens'
}

function segmentColor(id: TokenUsageSegmentId): string {
  const variable = TOKEN_SEGMENT_COLOR_VAR[id]
  return id === 'unknown' ? `hsl(var(${variable}) / 0.5)` : `hsl(var(${variable}))`
}

/**
 * Compact inline token visualization for dense list rows (GH-108). Renders the
 * total count plus a segmented mini-bar (input/output/cache/reasoning/unknown),
 * reusing the same `tokenUsageSegments` + chart-color source as the fuller
 * `TokenUsageDisplay` so colors stay consistent and dark/light adaptive. The
 * per-category breakdown is surfaced via `title`/`aria-label` (no Tooltip) so it
 * stays measurable and accessible inside the row's `<button>`.
 */
export function TokenSparkBar({ usage, className }: TokenSparkBarProps): React.ReactElement {
  const { t } = useTranslation()
  const segments = useMemo(() => tokenUsageSegments(usage), [usage])
  const totalLabel = `${formatNumber(usage.totalTokens)} ${t('usage.tokenUnit')}`
  const detail = useMemo(
    () =>
      segments
        .map((segment) => `${t(SEGMENT_LABEL_KEYS[segment.id])} ${formatNumber(segment.tokens)}`)
        .join(' / '),
    [segments, t]
  )

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums', className)}
      title={detail || totalLabel}
      aria-label={detail ? `${totalLabel} · ${detail}` : totalLabel}
    >
      <span className="text-muted-foreground">{totalLabel}</span>
      {segments.length > 0 && (
        <span
          data-testid="token-spark-bar-segments"
          aria-hidden="true"
          className="flex h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
        >
          {segments.map((segment) => (
            <span
              key={segment.id}
              style={{ backgroundColor: segmentColor(segment.id), width: `${segment.percentage}%` }}
            />
          ))}
        </span>
      )}
    </span>
  )
}
