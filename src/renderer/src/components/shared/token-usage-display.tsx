import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TokenUsageBreakdown } from '@shared/types/asset'
import {
  tokenUsageCacheDetails,
  tokenUsageSegments,
  type TokenUsageSegmentId
} from '@shared/token-usage'
import { formatNumber, cn } from '@/lib/utils'

interface TokenUsageDisplayProps {
  usage: TokenUsageBreakdown
  mode?: 'compact' | 'detail'
  className?: string
  showTextBreakdown?: boolean
  legendDensity?: 'normal' | 'compact'
}

const SEGMENT_CLASS: Record<TokenUsageSegmentId, string> = {
  input: 'bg-blue-500',
  output: 'bg-emerald-500',
  cache: 'bg-amber-500',
  reasoning: 'bg-violet-500',
  unknown: 'bg-muted-foreground/50'
}

const SEGMENT_LABEL_KEYS: Record<TokenUsageSegmentId, string> = {
  input: 'usage.inputTokens',
  output: 'usage.outputTokens',
  cache: 'usage.cacheTokens',
  reasoning: 'usage.reasoningTokens',
  unknown: 'usage.unknownTokens'
}

function formatPercentage(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`
}

export function TokenUsageDisplay({
  usage,
  mode = 'compact',
  className,
  showTextBreakdown = true,
  legendDensity = 'normal'
}: TokenUsageDisplayProps): React.ReactElement {
  const { t } = useTranslation()
  const cacheDetails = useMemo(() => tokenUsageCacheDetails(usage), [usage])
  const cacheTokens = cacheDetails.totalTokens
  const hasUnknownTokens = usage.unknownTokens > 0
  const segments = useMemo(() => tokenUsageSegments(usage), [usage])
  const cacheLabel = cacheDetails.hasDetails
    ? `${t('usage.cacheTokens')}: ${formatNumber(cacheDetails.totalTokens)} (${t('usage.cacheReadTokens')} ${formatNumber(cacheDetails.readTokens)} / ${t('usage.cacheWriteTokens')} ${formatNumber(cacheDetails.writeTokens)})`
    : `${t('usage.cacheTokens')}: ${formatNumber(cacheDetails.totalTokens)}`
  const title = useMemo(() => {
    if (!usage.hasBreakdown) {
      return [
        `${formatNumber(usage.totalTokens)} ${t('usage.tokenUnit')}`,
        hasUnknownTokens ? `${t('usage.unknownTokens')}: ${formatNumber(usage.unknownTokens)}` : null
      ].filter(Boolean).join(' | ')
    }
    return [
      `${t('usage.inputTokens')}: ${formatNumber(usage.inputTokens)}`,
      `${t('usage.outputTokens')}: ${formatNumber(usage.outputTokens)}`,
      cacheLabel,
      `${t('usage.reasoningTokens')}: ${formatNumber(usage.reasoningOutputTokens)}`,
      hasUnknownTokens ? `${t('usage.unknownTokens')}: ${formatNumber(usage.unknownTokens)}` : null
    ].filter(Boolean).join(' | ')
  }, [cacheLabel, hasUnknownTokens, t, usage])

  if (mode === 'detail') {
    return (
      <div className={cn('min-w-0 space-y-1', className)} title={title}>
        <div className={cn('font-medium tabular-nums', legendDensity === 'compact' && 'text-xl font-semibold')}>
          {formatNumber(usage.totalTokens)} {t('usage.tokenUnit')}
        </div>
        {showTextBreakdown && usage.hasBreakdown ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t('usage.inputTokens')}: {formatNumber(usage.inputTokens)}</span>
            <span>{t('usage.outputTokens')}: {formatNumber(usage.outputTokens)}</span>
            {cacheTokens > 0 && <span>{cacheLabel}</span>}
            {usage.reasoningOutputTokens > 0 && (
              <span>{t('usage.reasoningTokens')}: {formatNumber(usage.reasoningOutputTokens)}</span>
            )}
            {hasUnknownTokens && (
              <span>{t('usage.unknownTokens')}: {formatNumber(usage.unknownTokens)}</span>
            )}
          </div>
        ) : showTextBreakdown ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t('usage.breakdownUnavailable')}</span>
            {hasUnknownTokens && (
              <span>{t('usage.unknownTokens')}: {formatNumber(usage.unknownTokens)}</span>
            )}
          </div>
        ) : null}
        {segments.length > 0 && (
          <div className={cn('space-y-1.5 pt-1.5', legendDensity === 'compact' && 'space-y-1 pt-1')}>
            <div className={cn('flex overflow-hidden rounded-full bg-muted', legendDensity === 'compact' ? 'h-2' : 'h-1.5')}>
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className={SEGMENT_CLASS[segment.id]}
                  style={{ width: `${segment.percentage}%` }}
                  title={`${segment.id === 'cache' ? cacheLabel : `${t(SEGMENT_LABEL_KEYS[segment.id])}: ${formatNumber(segment.tokens)}`} (${formatPercentage(segment.percentage)})`}
                />
              ))}
            </div>
            <div
              className={cn(
                'flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground',
                legendDensity === 'compact' && 'gap-x-3 text-xs leading-5'
              )}
            >
              {segments.map((segment) => (
                <span key={segment.id} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', SEGMENT_CLASS[segment.id])} />
                  <span>
                    {t(SEGMENT_LABEL_KEYS[segment.id])} {formatNumber(segment.tokens)}
                  </span>
                  <span className="tabular-nums">({formatPercentage(segment.percentage)})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1 whitespace-nowrap tabular-nums', className)}
      title={title}
    >
      <span>{formatNumber(usage.totalTokens)} {t('usage.tokenUnit')}</span>
      {usage.hasBreakdown && (
        <span className="text-muted-foreground">
          · {t('usage.inputTokensShort')} {formatNumber(usage.inputTokens)} /{' '}
          {t('usage.outputTokensShort')} {formatNumber(usage.outputTokens)}
          {hasUnknownTokens && (
            <>
              {' / '}
              {t('usage.unknownTokens')} {formatNumber(usage.unknownTokens)}
            </>
          )}
        </span>
      )}
      {!usage.hasBreakdown && hasUnknownTokens && (
        <span className="text-muted-foreground">
          · {t('usage.unknownTokens')} {formatNumber(usage.unknownTokens)}
        </span>
      )}
    </span>
  )
}
