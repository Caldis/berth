import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { AlertTriangle, DollarSign, Coins, Gauge, FlaskConical } from 'lucide-react'
import { cn, formatNumber, formatCurrency } from '@/lib/utils'
import type {
  CostSource,
  PricingMiss,
  UsageModelBreakdown,
  UsageProjectBreakdown,
  UsageSummary
} from '@shared/types/asset'
import { normalizeTokenUsage } from '@shared/token-usage'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { useAppStore } from '@/stores/app'
import { CostSourceBadge } from '@/components/shared/cost-source-badge'

const CHART_COLORS = [
  'hsl(216, 57%, 25%)',
  'hsl(24.6, 95%, 53.1%)',
  'hsl(173, 58%, 39%)',
  'hsl(43, 96%, 56%)',
  'hsl(339, 81%, 59%)'
]

const TIME_RANGES = [
  { value: 7, labelKey: 'overview.timeRange.7d' },
  { value: 30, labelKey: 'overview.timeRange.30d' },
  { value: 365, labelKey: 'overview.timeRange.all' }
] as const

function formatSignedCurrency(amount: number): string {
  if (amount === 0) return formatCurrency(0)
  return amount > 0 ? `+${formatCurrency(amount)}` : `-${formatCurrency(Math.abs(amount))}`
}

function pricingMissLabel(miss: PricingMiss): string {
  return miss.model ?? 'unknown'
}

function normalizeUsageSummary(summary: UsageSummary): UsageSummary {
  const totalCost = numberOrZero(summary.totalCost)
  const tokenUsage = normalizeTokenUsage(summary.tokenUsage ?? { totalTokens: summary.totalTokens })
  const costSource = normalizeCostSource(summary.costSource, totalCost)

  return {
    totalCost,
    actualCost: numberOrZero(summary.actualCost),
    estimatedCost: numberOrZero(summary.estimatedCost),
    costDelta: numberOrZero(summary.costDelta),
    totalTokens: numberOrZero(summary.totalTokens) || tokenUsage.totalTokens,
    tokenUsage,
    costSource,
    pricingMisses: arrayOrEmpty(summary.pricingMisses),
    dailyCosts: arrayOrEmpty(summary.dailyCosts),
    dailyTokenUsage: arrayOrEmpty(summary.dailyTokenUsage).map((item) => ({
      ...item,
      tokenUsage: normalizeTokenUsage(item.tokenUsage)
    })),
    byModel: arrayOrEmpty(summary.byModel).map((item) =>
      normalizeModelBreakdown(item, costSource)
    ),
    byProject: arrayOrEmpty(summary.byProject).map((item) =>
      normalizeProjectBreakdown(item, costSource)
    ),
    rateLimits: arrayOrEmpty(summary.rateLimits)
  }
}

function normalizeModelBreakdown(
  item: UsageModelBreakdown,
  fallbackSource: CostSource
): UsageModelBreakdown {
  const cost = numberOrZero(item.cost)
  const tokenUsage = normalizeTokenUsage(item.tokenUsage ?? { totalTokens: item.tokens })

  return {
    ...item,
    percentage: numberOrZero(item.percentage),
    cost,
    actualCost: numberOrZero(item.actualCost),
    estimatedCost: numberOrZero(item.estimatedCost),
    costDelta: numberOrZero(item.costDelta),
    costSource: normalizeCostSource(item.costSource ?? fallbackSource, cost),
    pricingMisses: arrayOrEmpty(item.pricingMisses),
    tokens: numberOrZero(item.tokens) || tokenUsage.totalTokens,
    tokenUsage
  }
}

function normalizeProjectBreakdown(
  item: UsageProjectBreakdown,
  fallbackSource: CostSource
): UsageProjectBreakdown {
  const cost = numberOrZero(item.cost)
  const tokenUsage = normalizeTokenUsage(item.tokenUsage ?? { totalTokens: item.tokens })

  return {
    ...item,
    percentage: numberOrZero(item.percentage),
    cost,
    actualCost: numberOrZero(item.actualCost),
    estimatedCost: numberOrZero(item.estimatedCost),
    costDelta: numberOrZero(item.costDelta),
    costSource: normalizeCostSource(item.costSource ?? fallbackSource, cost),
    pricingMisses: arrayOrEmpty(item.pricingMisses),
    tokens: numberOrZero(item.tokens) || tokenUsage.totalTokens,
    tokenUsage
  }
}

function normalizeCostSource(value: unknown, cost: number): CostSource {
  if (value === 'actual' || value === 'estimated' || value === 'mixed' || value === 'unknown') {
    return value
  }
  return cost > 0 ? 'actual' : 'unknown'
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function Usage(): React.ReactElement {
  const { t } = useTranslation()
  const [days, setDays] = useState(30)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const agentView = useAppStore((s) => s.agentView)

  useEffect(() => {
    let cancelled = false
    window.api?.usage
      .summary({ days, agentView })
      .then((data) => {
        if (!cancelled) setUsage(normalizeUsageSummary(data))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [agentView, days])

  const hasCostData = usage && usage.dailyCosts.length > 0
  const hasModelData = usage && usage.byModel.length > 0
  const hasProjectData = usage && usage.byProject.length > 0
  const hasRateLimits = usage && usage.rateLimits.length > 0
  const hasPricingMisses = usage && usage.pricingMisses.length > 0
  const showCostDetails = usage && (usage.actualCost > 0 || usage.estimatedCost > 0 || usage.costDelta !== 0)
  const costLabelKey =
    usage?.costSource === 'actual'
      ? 'usage.actualCost'
      : usage?.costSource === 'estimated'
        ? 'usage.estimatedCost'
        : usage?.costSource === 'mixed'
          ? 'usage.mixedCost'
          : 'usage.unknownCost'
  const costValue = usage && usage.costSource !== 'unknown'
    ? formatCurrency(usage.totalCost)
    : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('usage.title')}</h1>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDays(range.value)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                days === range.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(range.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                {t(costLabelKey)}
              </span>
            </div>
            {usage && <CostSourceBadge source={usage.costSource} />}
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {costValue}
          </p>
          {showCostDetails && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="min-w-0 rounded-md bg-muted/60 px-2 py-1.5">
                <div className="text-muted-foreground">{t('usage.actualCostShort')}</div>
                <div className="truncate font-medium tabular-nums">{formatCurrency(usage.actualCost)}</div>
              </div>
              <div className="min-w-0 rounded-md bg-muted/60 px-2 py-1.5">
                <div className="text-muted-foreground">{t('usage.estimatedCostShort')}</div>
                <div className="truncate font-medium tabular-nums">{formatCurrency(usage.estimatedCost)}</div>
              </div>
              <div className="min-w-0 rounded-md bg-muted/60 px-2 py-1.5">
                <div className="text-muted-foreground">{t('usage.deltaCostShort')}</div>
                <div className="truncate font-medium tabular-nums">{formatSignedCurrency(usage.costDelta)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              {t('usage.tokensUsed')}
            </span>
          </div>
          {usage ? (
            <TokenUsageDisplay usage={usage.tokenUsage} mode="detail" className="mt-2" />
          ) : (
            <p className="mt-2 text-3xl font-bold tabular-nums">0 {t('usage.tokenUnit')}</p>
          )}
        </div>
      </div>

      {hasPricingMisses && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t('usage.pricingGapsTitle')}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('usage.pricingGapsBody', { count: usage.pricingMisses.length })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {usage.pricingMisses.slice(0, 4).map((miss) => (
                  <span
                    key={`${miss.model ?? 'unknown'}-${miss.reason}`}
                    className="max-w-full truncate rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                  >
                    {pricingMissLabel(miss)} · {formatNumber(miss.tokens)} {t('usage.tokenUnit')}
                  </span>
                ))}
                {usage.pricingMisses.length > 4 && (
                  <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                    {t('usage.pricingGapsMore', { count: usage.pricingMisses.length - 4 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily cost chart */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">{t('usage.dailyCost')}</h2>
        </div>
        <div className="p-4">
          {hasCostData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usage!.dailyCosts} barSize={12}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                  labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                />
                <Bar dataKey="cost" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Model + Project breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* By Model */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">{t('usage.byModel')}</h2>
          </div>
          <div className="p-4">
            {hasModelData ? (
              <div className="flex items-center gap-6">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usage!.byModel}
                        dataKey="percentage"
                        nameKey="model"
                        innerRadius={30}
                        outerRadius={55}
                        strokeWidth={0}
                      >
                        {usage!.byModel.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {usage!.byModel.map((item, i) => (
                    <div key={item.model} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="flex-1 truncate text-muted-foreground">
                          {item.model}
                        </span>
                        <CostSourceBadge source={item.costSource} />
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(item.tokens)} {t('usage.tokenUnit')}
                        </span>
                        <span className="tabular-nums font-medium">{item.percentage}%</span>
                      </div>
                      {item.pricingMisses.length > 0 && (
                        <div className="pl-4 text-xs text-amber-700 dark:text-amber-300">
                          {t('usage.pricingGapShort', { count: item.pricingMisses.length })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('common.empty')}
              </p>
            )}
          </div>
        </div>

        {/* By Project */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-medium">{t('usage.byProject')}</h2>
          </div>
          <div className="p-4">
            {hasProjectData ? (
              <div className="space-y-3">
                {usage!.byProject.map((item, i) => (
                  <div key={item.project}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.project}</span>
                      <CostSourceBadge source={item.costSource} className="ml-2" />
                      <span className="ml-2 tabular-nums text-muted-foreground">
                        {formatNumber(item.tokens)} {t('usage.tokenUnit')}
                      </span>
                      <span className="ml-2 tabular-nums font-medium">{item.percentage}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                        }}
                      />
                    </div>
                    {item.pricingMisses.length > 0 && (
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {t('usage.pricingGapShort', { count: item.pricingMisses.length })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('common.empty')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rate limits */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium">{t('usage.rateLimits')}</h2>
        </div>
        <div className="p-4">
          {hasRateLimits ? (
            <div className="space-y-4">
              {usage!.rateLimits.map((limit) => {
                const pct = limit.total > 0 ? (limit.remaining / limit.total) * 100 : 0
                const isLow = pct < 25
                return (
                  <div key={limit.window}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{limit.window}</span>
                      <span className={cn('tabular-nums', isLow && 'text-destructive')}>
                        {Math.round(pct)}% {t('usage.remaining')}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isLow ? 'bg-destructive' : 'bg-accent'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('usage.resetsIn')}: {limit.resetsIn}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Gauge className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Experimental flags */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            {t('usage.experimentalFlags')}
          </h2>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
        </div>
      </div>
    </div>
  )
}
