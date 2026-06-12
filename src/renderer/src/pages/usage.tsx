import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Calculator, DollarSign, Coins, Copy } from 'lucide-react'
import { cn, formatNumber, formatCurrency } from '@/lib/utils'
import type {
  CostMode,
  PricingMiss,
  PricingMissReason,
  PricingSourceName,
  UsageCostFormula,
  UsageDimensionCost,
  UsageModelBreakdown,
  UsageProjectBreakdown,
  UsageSummary
} from '@shared/types/asset'
import { normalizeUsageSummary } from '@shared/usage-summary'
import { TokenUsageDisplay } from '@/components/shared/token-usage-display'
import { useAppStore } from '@/stores/app'
import { CostSourceBadge } from '@/components/shared/cost-source-badge'
import { NoticePanel } from '@/components/shared/notice-panel'
import { projectPathForScope } from '@shared/scope'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { FilterSelect, SelectItem } from '@/components/ui'
import { CHART_CATEGORICAL, CHART_SERIES_FILL } from '@/lib/chart-colors'

const TIME_RANGES = [
  { value: 7, labelKey: 'overview.timeRange.7d' },
  { value: 30, labelKey: 'overview.timeRange.30d' },
  { value: 0, labelKey: 'overview.timeRange.all' }
] as const

const COST_MODES: { value: CostMode; labelKey: string; tooltipKey: string }[] = [
  {
    value: 'auto',
    labelKey: 'usage.costMode.auto',
    tooltipKey: 'usage.costModeTooltip.auto'
  },
  {
    value: 'actual',
    labelKey: 'usage.costMode.actual',
    tooltipKey: 'usage.costModeTooltip.actual'
  },
  {
    value: 'estimated',
    labelKey: 'usage.costMode.estimated',
    tooltipKey: 'usage.costModeTooltip.estimated'
  }
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

function formatCostValue(cost: number, source: UsageDimensionCost['costSource']): string {
  return source === 'unknown' ? '—' : formatCurrency(cost)
}

function hasCostDetail(value: UsageDimensionCost): boolean {
  return value.actualCost > 0 || value.estimatedCost > 0 || value.costDelta !== 0
}

function hasKnownCost(value: UsageDimensionCost): boolean {
  return value.costSource !== 'unknown'
}

function UsageLoadingSkeleton(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="space-y-4" role="status" aria-label={t('usage.loadingSummary')}>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="rounded-xl border border-border bg-card p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="h-9 animate-pulse rounded-md bg-muted/70" />
              <div className="h-9 animate-pulse rounded-md bg-muted/70" />
              <div className="h-9 animate-pulse rounded-md bg-muted/70" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted/70" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-md bg-muted/70" />
            <div className="h-20 animate-pulse rounded-md bg-muted/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

function CostDetailPills({ value }: { value: UsageDimensionCost }): React.ReactElement | null {
  const { t } = useTranslation()
  if (!hasCostDetail(value)) return null

  return (
    <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
      {value.actualCost > 0 && (
        <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
          {t('usage.actualCostShort')} {formatCurrency(value.actualCost)}
        </span>
      )}
      {value.estimatedCost > 0 && (
        <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
          {t('usage.estimatedCostShort')} {formatCurrency(value.estimatedCost)}
        </span>
      )}
      {value.costDelta !== 0 && (
        <span className="rounded-md bg-muted/60 px-2 py-1 tabular-nums">
          {t('usage.deltaCostShort')} {formatSignedCurrency(value.costDelta)}
        </span>
      )}
    </div>
  )
}

function UsageModelRow({
  item,
  color
}: {
  item: UsageModelBreakdown
  color: string
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="min-w-0 truncate text-sm font-medium">{item.model}</span>
            <CostSourceBadge source={item.costSource} />
          </div>
          <TokenUsageDisplay usage={item.tokenUsage} mode="compact" className="text-sm text-muted-foreground" />
          <CostDetailPills value={item} />
          {item.pricingMisses.length > 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-300">
              {t('usage.pricingGapShort', { count: item.pricingMisses.length })}
            </div>
          )}
        </div>
        <div className="shrink-0 text-left md:text-right">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('usage.modelCost')}
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {formatCostValue(item.cost, item.costSource)}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {t('usage.tokenShare', { percentage: item.percentage })}
          </div>
        </div>
      </div>
    </div>
  )
}

function UsageProjectRow({
  item,
  color
}: {
  item: UsageProjectBreakdown
  color: string
}): React.ReactElement {
  const { t } = useTranslation()
  const width = Math.max(0, Math.min(100, item.percentage))

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium">{item.project}</span>
            <CostSourceBadge source={item.costSource} />
          </div>
          <TokenUsageDisplay usage={item.tokenUsage} mode="compact" className="text-sm text-muted-foreground" />
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('usage.projectCost')}
          </div>
          <div className="mt-1 text-base font-semibold tabular-nums">
            {formatCostValue(item.cost, item.costSource)}
          </div>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {t('usage.tokenShare', { percentage: item.percentage })}
        </span>
        {item.pricingMisses.length > 0 && (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            {t('usage.pricingGapShort', { count: item.pricingMisses.length })}
          </span>
        )}
      </div>
      <CostDetailPills value={item} />
    </div>
  )
}

export function Usage(): React.ReactElement {
  const { t } = useTranslation()
  const [days, setDays] = useState(0)
  const [costMode, setCostMode] = useState<CostMode>('auto')
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [hasLoadedUsage, setHasLoadedUsage] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [showPricingOverride, setShowPricingOverride] = useState(false)
  const [pricingOverrideCopied, setPricingOverrideCopied] = useState(false)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    const request = {
      days,
      costMode,
      ...(projectPath ? { projectPath } : {})
    }
    window.api?.usage
      .summary(request)
      .then((data) => {
        if (!cancelled) {
          setUsage(normalizeUsageSummary(data))
          setLoadError(false)
          setHasLoadedUsage(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true)
          setHasLoadedUsage(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [costMode, days, projectPath, reloadKey])

  const hasCostData = usage && usage.dailyCosts.length > 0
  const hasModelData = usage && usage.byModel.length > 0
  const hasProjectData = usage && usage.byProject.length > 0
  const hasPricingMisses = usage && usage.pricingMisses.length > 0
  const showCostDetails = usage && hasCostDetail(usage)
  const selectedCostMode = COST_MODES.find((mode) => mode.value === costMode) ?? COST_MODES[0]
  const costLabelKey =
    usage?.costSource === 'actual'
      ? 'usage.actualCost'
      : usage?.costSource === 'estimated'
        ? 'usage.estimatedCost'
        : usage?.costSource === 'mixed'
          ? 'usage.mixedCost'
          : 'usage.unknownCost'
  const costValue = usage && hasKnownCost(usage)
    ? formatCurrency(usage.totalCost)
    : '—'
  const pricingOverrideMiss = usage?.pricingMisses.find(canShowPricingOverrideExample)
  const pricingOverrideJson = pricingOverrideMiss ? pricingOverrideExample(pricingOverrideMiss) : ''
  const isInitialLoading = !hasLoadedUsage && !usage && !loadError

  const pageChromeActions = useMemo<React.ReactNode>(() => (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => setDays(range.value)}
          aria-pressed={days === range.value}
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
  ), [days, t])

  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title: t('usage.title'),
    subtitle: t('usage.subtitle'),
    sectionLabelKey: 'nav.sections.operations',
    actions: pageChromeActions
  }), [pageChromeActions, t])
  usePageChrome(pageChrome, [pageChrome])

  async function copyPricingOverride(): Promise<void> {
    if (!pricingOverrideJson || !navigator.clipboard) return
    await navigator.clipboard.writeText(pricingOverrideJson)
    setPricingOverrideCopied(true)
  }

  return (
    <div className="space-y-6">
      {isInitialLoading ? (
        <UsageLoadingSkeleton />
      ) : (
        <>
          {loadError && (
            <NoticePanel
              tone="error"
              title={t('usage.loadErrorTitle')}
              message={t(usage ? 'usage.loadErrorStaleBody' : 'usage.loadErrorBody')}
              className="rounded-xl"
              action={
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  {t('common.retry')}
                </button>
              }
            />
          )}

          {loadError && !usage ? null : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {t(costLabelKey)}
                      </span>
                    </div>
                    {usage && <CostSourceBadge source={usage.costSource} />}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">
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

                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {t('usage.tokensUsed')}
                    </span>
                  </div>
                  {usage ? (
                    <TokenUsageDisplay usage={usage.tokenUsage} mode="detail" className="mt-2" />
                  ) : (
                    <p className="mt-2 text-3xl font-semibold tabular-nums">0 {t('usage.tokenUnit')}</p>
                  )}
                </div>
              </div>

              {usage && (
                <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="usage-cost-source-heading">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                        <h2 id="usage-cost-source-heading">{t('usage.costExplanationTitle')}</h2>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        {t('usage.costScopeNotice')}
                      </p>
                    </div>
                    <div className="min-w-[190px]">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('usage.costModeLabel')}
                      </span>
                      <FilterSelect
                        aria-label={t('usage.costModeLabel')}
                        aria-describedby="usage-cost-mode-help"
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={[costMode]}
                        onSelectionChange={(keys) => {
                          const next = Array.from(keys)[0]
                          if (next) setCostMode(next as CostMode)
                        }}
                        className="mt-1 w-full"
                      >
                        {COST_MODES.map((mode) => (
                          <SelectItem key={mode.value}>{t(mode.labelKey)}</SelectItem>
                        ))}
                      </FilterSelect>
                      <p id="usage-cost-mode-help" className="mt-1 text-xs text-muted-foreground">
                        {t(selectedCostMode.tooltipKey)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-md border border-border bg-background p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('usage.costFormulaLabel')}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CostSourceBadge source={usage.costSource} />
                        <span className="text-sm font-medium">
                          {t(FORMULA_LABEL_KEYS[usage.costExplanation.formula])}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t(`usage.costFormula.${usage.costExplanation.formula}Desc`)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border bg-background p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('usage.sourceLocalScanTitle')}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {t('usage.sourceLocalScanBody')}
                        </p>
                      </div>

                      <div className="rounded-md border border-border bg-background p-3">
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

                      <div className="rounded-md border border-border bg-background p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('usage.pricingCatalogLabel')}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {usage.costExplanation.catalog.sources.length > 0 ? (
                            usage.costExplanation.catalog.sources.map((source) => (
                              <div key={`${source.name}-${source.url}`} className="truncate" title={source.url}>
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
                </section>
              )}

              {hasPricingMisses && (
                <NoticePanel
                  tone="warning"
                  title={t('usage.pricingGapsTitle')}
                  message={t('usage.pricingGapsBody', { count: usage.pricingMisses.length })}
                  className="rounded-xl"
                >
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-medium">{t('usage.pricingOverrideExample')}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {showPricingOverride && (
                            <button
                              type="button"
                              onClick={copyPricingOverride}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {pricingOverrideCopied
                                ? t('usage.copiedPricingOverride')
                                : t('usage.copyPricingOverride')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setShowPricingOverride((value) => !value)
                              setPricingOverrideCopied(false)
                            }}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            {showPricingOverride
                              ? t('usage.hidePricingOverrideExample')
                              : t('usage.showPricingOverrideExample')}
                          </button>
                        </div>
                      </div>
                      {showPricingOverride && (
                        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
                          <code>{pricingOverrideJson}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </NoticePanel>
              )}

              <div className="rounded-lg border border-border bg-card">
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
                          formatter={(value: number) => [`$${value.toFixed(2)}`, t('usage.cost')]}
                          labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                        />
                        <Bar dataKey="cost" fill={CHART_SERIES_FILL} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center">
                      <p className="text-sm text-muted-foreground">{t('usage.emptyDailyCost')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <section
                  role="region"
                  aria-labelledby="usage-by-model-heading"
                  className="rounded-lg border border-border bg-card"
                >
                  <div className="border-b border-border px-5 py-3">
                    <h2 id="usage-by-model-heading" className="text-sm font-medium">
                      {t('usage.byModel')}
                    </h2>
                  </div>
                  <div className="p-4">
                    {hasModelData ? (
                      <div className="space-y-3">
                        {usage!.byModel.map((item, i) => (
                          <UsageModelRow
                            key={item.model}
                            item={item}
                            color={CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        {t('usage.emptyModels')}
                      </p>
                    )}
                  </div>
                </section>

                <section
                  role="region"
                  aria-labelledby="usage-by-project-heading"
                  className="rounded-lg border border-border bg-card"
                >
                  <div className="border-b border-border px-5 py-3">
                    <h2 id="usage-by-project-heading" className="text-sm font-medium">
                      {t('usage.byProject')}
                    </h2>
                  </div>
                  <div className="p-4">
                    {hasProjectData ? (
                      <div className="space-y-3">
                        {usage!.byProject.map((item, i) => (
                          <UsageProjectRow
                            key={item.project}
                            item={item}
                            color={CHART_CATEGORICAL[i % CHART_CATEGORICAL.length]}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        {t('usage.emptyProjects')}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
