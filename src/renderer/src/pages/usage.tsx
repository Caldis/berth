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
import { AlertTriangle, Calculator, DollarSign, Coins, Gauge, FlaskConical } from 'lucide-react'
import { cn, formatNumber, formatCurrency } from '@/lib/utils'
import type {
  CostMode,
  PricingMiss,
  PricingMissReason,
  PricingSourceName,
  UsageCostFormula,
  UsageSummary
} from '@shared/types/asset'
import { normalizeUsageSummary } from '@shared/usage-summary'
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

const COST_MODES: { value: CostMode; labelKey: string }[] = [
  { value: 'auto', labelKey: 'usage.costMode.auto' },
  { value: 'actual', labelKey: 'usage.costMode.actual' },
  { value: 'estimated', labelKey: 'usage.costMode.estimated' }
]

const FORMULA_LABEL_KEYS: Record<UsageCostFormula, string> = {
  actual: 'usage.costFormula.actual',
  estimated: 'usage.costFormula.estimated',
  mixed: 'usage.costFormula.mixed',
  unknown: 'usage.costFormula.unknown'
}

const PRICING_SOURCE_LABEL_KEYS: Record<PricingSourceName, string> = {
  litellm: 'usage.pricingSource.litellm',
  'models.dev': 'usage.pricingSource.modelsDev',
  local: 'usage.pricingSource.local'
}

const PRICING_MISS_LABEL_KEYS: Record<PricingMissReason, string> = {
  'missing-model-pricing': 'usage.pricingGapReason.missingModelPricing',
  'missing-token-breakdown': 'usage.pricingGapReason.missingTokenBreakdown',
  'missing-price-component': 'usage.pricingGapReason.missingPriceComponent'
}

const PRICING_MISS_DESCRIPTION_KEYS: Record<PricingMissReason, string> = {
  'missing-model-pricing': 'usage.pricingGapReason.missingModelPricingDesc',
  'missing-token-breakdown': 'usage.pricingGapReason.missingTokenBreakdownDesc',
  'missing-price-component': 'usage.pricingGapReason.missingPriceComponentDesc'
}

function formatSignedCurrency(amount: number): string {
  if (amount === 0) return formatCurrency(0)
  return amount > 0 ? `+${formatCurrency(amount)}` : `-${formatCurrency(Math.abs(amount))}`
}

function pricingMissLabel(miss: PricingMiss): string {
  return miss.model ?? 'unknown'
}

function canShowPricingOverrideExample(miss: PricingMiss): boolean {
  return miss.reason === 'missing-model-pricing' || miss.reason === 'missing-price-component'
}

function pricingOverrideExample(miss: PricingMiss): string {
  const id = miss.model ?? 'provider/model-id'
  return JSON.stringify(
    {
      models: [
        {
          id,
          inputCostPerToken: 0.000003,
          outputCostPerToken: 0.000015,
          cacheReadInputCostPerToken: 0.0000003,
          cacheCreationInputCostPerToken: 0.00000375,
          reasoningOutputCostPerToken: 0.000015
        }
      ]
    },
    null,
    2
  )
}

function formatCatalogDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function Usage(): React.ReactElement {
  const { t } = useTranslation()
  const [days, setDays] = useState(30)
  const [costMode, setCostMode] = useState<CostMode>('auto')
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const agentView = useAppStore((s) => s.agentView)

  useEffect(() => {
    let cancelled = false
    window.api?.usage
      .summary({ days, agentView, costMode })
      .then((data) => {
        if (!cancelled) setUsage(normalizeUsageSummary(data))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [agentView, costMode, days])

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
  const pricingOverrideMiss = usage?.pricingMisses.find(canShowPricingOverrideExample)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('usage.title')}</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1"
            aria-label={t('usage.costModeLabel')}
          >
            {COST_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setCostMode(mode.value)}
                aria-pressed={costMode === mode.value}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  costMode === mode.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(mode.labelKey)}
              </button>
            ))}
          </div>
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

      {usage && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            {t('usage.costExplanationTitle')}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('usage.costFormulaLabel')}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CostSourceBadge source={usage.costSource} />
                <span className="text-sm font-medium">
                  {t(FORMULA_LABEL_KEYS[usage.costExplanation.formula])}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`usage.costFormula.${usage.costExplanation.formula}Desc`)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('usage.pricingSourcesLabel')}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {usage.costExplanation.pricingSources.length > 0 ? (
                    usage.costExplanation.pricingSources.map((source) => (
                      <span
                        key={`${source.source}-${source.sourceUrl ?? ''}-${source.updatedAt ?? ''}`}
                        className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
                      >
                        {t(PRICING_SOURCE_LABEL_KEYS[source.source])} ·{' '}
                        {t('usage.pricingSourceCount', { count: source.count })}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('usage.pricingSourcesEmpty')}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('usage.pricingCatalogLabel')}
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {usage.costExplanation.catalog.sources.length > 0 ? (
                    usage.costExplanation.catalog.sources.map((source) => (
                      <div key={`${source.name}-${source.url}`} className="truncate">
                        {t(PRICING_SOURCE_LABEL_KEYS[source.name])} ·{' '}
                        {formatCatalogDate(source.fetchedAt)}
                      </div>
                    ))
                  ) : (
                    <div>{t('usage.pricingSourcesEmpty')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasPricingMisses && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t('usage.pricingGapsTitle')}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('usage.pricingGapsBody', { count: usage.pricingMisses.length })}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {usage.pricingMisses.slice(0, 4).map((miss) => (
                  <div
                    key={`${miss.model ?? 'unknown'}-${miss.reason}`}
                    className="rounded-md border border-amber-500/20 bg-background/80 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {pricingMissLabel(miss)} · {formatNumber(miss.tokens)} {t('usage.tokenUnit')}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {t(PRICING_MISS_LABEL_KEYS[miss.reason])}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(PRICING_MISS_DESCRIPTION_KEYS[miss.reason])}
                    </p>
                  </div>
                ))}
                {usage.pricingMisses.length > 4 && (
                  <div className="rounded-md border border-amber-500/20 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                    {t('usage.pricingGapsMore', { count: usage.pricingMisses.length - 4 })}
                  </div>
                )}
              </div>
              {pricingOverrideMiss && (
                <div className="mt-3 rounded-md border border-amber-500/20 bg-background/80 p-3">
                  <div className="text-xs font-medium">{t('usage.pricingOverrideExample')}</div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
                    <code>{pricingOverrideExample(pricingOverrideMiss)}</code>
                  </pre>
                </div>
              )}
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
