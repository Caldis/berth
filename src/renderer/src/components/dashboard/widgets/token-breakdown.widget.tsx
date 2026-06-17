import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { tokenUsageSegments, type TokenUsageSegmentId } from '@shared/token-usage'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { TOKEN_SEGMENT_COLOR_VAR } from '@/lib/chart-colors'
import { formatCompactNumber } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'

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

// GH-138: Token 构成 widget — 堆叠条 + 图例。token 分段是语义分类, 用分类色 (TOKEN_SEGMENT_COLOR_VAR),
// 与活动热力图的单色相区分 (不同语义不同编码)。
export function TokenBreakdownWidget(): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const { usage, loading } = useUsageSummary(30, undefined, projectPath)

  const tokenUsage = usage?.tokenUsage
  const segments = useMemo(
    () => (tokenUsage ? tokenUsageSegments(tokenUsage).filter((s) => s.tokens > 0) : []),
    [tokenUsage]
  )
  const total = segments.reduce((sum, s) => sum + s.tokens, 0)

  if (loading && !usage) {
    return <div className="h-[120px] w-full animate-pulse rounded-lg bg-muted/40" />
  }
  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t('usage.breakdownUnavailable')}</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
        {segments.map((seg) => (
          <div
            key={seg.id}
            style={{ width: `${(seg.tokens / total) * 100}%`, backgroundColor: segmentColor(seg.id) }}
            title={`${t(SEGMENT_LABEL_KEYS[seg.id])}: ${formatCompactNumber(seg.tokens)}`}
          />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {segments.map((seg) => (
          <div key={seg.id} className="flex items-center justify-between gap-2">
            <dt className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: segmentColor(seg.id) }} />
              <span className="truncate">{t(SEGMENT_LABEL_KEYS[seg.id])}</span>
            </dt>
            <dd className="shrink-0 text-xs font-medium tabular-nums text-foreground">
              {formatCompactNumber(seg.tokens)}
              <span className="ml-1 text-muted-foreground">{Math.round((seg.tokens / total) * 100)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
