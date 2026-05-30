import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TokenUsageBreakdown } from '@shared/types/asset'
import { formatNumber, cn } from '@/lib/utils'

interface TokenUsageDisplayProps {
  usage: TokenUsageBreakdown
  mode?: 'compact' | 'detail'
  className?: string
}

export function TokenUsageDisplay({
  usage,
  mode = 'compact',
  className
}: TokenUsageDisplayProps): React.ReactElement {
  const { t } = useTranslation()
  const cacheTokens = usage.cacheReadInputTokens + usage.cacheCreationInputTokens
  const title = useMemo(() => {
    if (!usage.hasBreakdown) {
      return `${formatNumber(usage.totalTokens)} ${t('usage.tokenUnit')}`
    }
    return [
      `${t('usage.inputTokens')}: ${formatNumber(usage.inputTokens)}`,
      `${t('usage.outputTokens')}: ${formatNumber(usage.outputTokens)}`,
      `${t('usage.cacheTokens')}: ${formatNumber(cacheTokens)}`,
      `${t('usage.reasoningTokens')}: ${formatNumber(usage.reasoningOutputTokens)}`
    ].join(' | ')
  }, [cacheTokens, t, usage])

  if (mode === 'detail') {
    return (
      <div className={cn('min-w-0 space-y-1', className)} title={title}>
        <div className="font-medium tabular-nums">
          {formatNumber(usage.totalTokens)} {t('usage.tokenUnit')}
        </div>
        {usage.hasBreakdown ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t('usage.inputTokens')}: {formatNumber(usage.inputTokens)}</span>
            <span>{t('usage.outputTokens')}: {formatNumber(usage.outputTokens)}</span>
            {cacheTokens > 0 && <span>{t('usage.cacheTokens')}: {formatNumber(cacheTokens)}</span>}
            {usage.reasoningOutputTokens > 0 && (
              <span>{t('usage.reasoningTokens')}: {formatNumber(usage.reasoningOutputTokens)}</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">{t('usage.breakdownUnavailable')}</div>
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
        </span>
      )}
    </span>
  )
}
