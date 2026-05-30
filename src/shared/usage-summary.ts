import type {
  CostMode,
  CostSource,
  UsageCostExplanation,
  UsageModelBreakdown,
  UsageProjectBreakdown,
  UsageSummary
} from './types/asset'
import { emptyTokenUsage, normalizeTokenUsage } from './token-usage'

export function emptyUsageSummary(): UsageSummary {
  return {
    costMode: 'auto',
    totalCost: 0,
    actualCost: 0,
    estimatedCost: 0,
    costDelta: 0,
    costExplanation: emptyCostExplanation(),
    totalTokens: 0,
    tokenUsage: emptyTokenUsage(),
    costSource: 'unknown',
    pricingMisses: [],
    dailyCosts: [],
    dailyTokenUsage: [],
    byModel: [],
    byProject: [],
    rateLimits: []
  }
}

export function normalizeUsageSummary(value: unknown): UsageSummary {
  if (!isRecord(value)) return emptyUsageSummary()

  const totalCost = numberOrZero(value.totalCost)
  const tokenUsage = normalizeTokenUsage(value.tokenUsage ?? { totalTokens: value.totalTokens })
  const costSource = normalizeCostSource(value.costSource, totalCost)
  const costMode = normalizeCostMode(value.costMode)

  return {
    costMode,
    totalCost,
    actualCost: numberOrZero(value.actualCost),
    estimatedCost: numberOrZero(value.estimatedCost),
    costDelta: numberOrZero(value.costDelta),
    costExplanation: normalizeCostExplanation(value.costExplanation, costSource),
    totalTokens: numberOrZero(value.totalTokens) || tokenUsage.totalTokens,
    tokenUsage,
    costSource,
    pricingMisses: arrayOrEmpty(value.pricingMisses),
    dailyCosts: arrayOrEmpty(value.dailyCosts),
    dailyTokenUsage: arrayOrEmpty(value.dailyTokenUsage).map((item) => {
      const record = isRecord(item) ? item : {}
      return {
        date: typeof record.date === 'string' ? record.date : '',
        tokenUsage: normalizeTokenUsage(record.tokenUsage)
      }
    }),
    byModel: arrayOrEmpty(value.byModel).map((item) =>
      normalizeUsageModelBreakdown(item, costSource)
    ),
    byProject: arrayOrEmpty(value.byProject).map((item) =>
      normalizeUsageProjectBreakdown(item, costSource)
    ),
    rateLimits: arrayOrEmpty(value.rateLimits)
  }
}

function emptyCostExplanation(): UsageCostExplanation {
  return {
    formula: 'unknown',
    pricingSources: [],
    catalog: { sources: [] }
  }
}

function normalizeCostExplanation(value: unknown, source: CostSource): UsageCostExplanation {
  if (!isRecord(value)) {
    return {
      ...emptyCostExplanation(),
      formula: costSourceToFormula(source)
    }
  }

  const catalog = isRecord(value.catalog) ? value.catalog : {}
  return {
    formula: normalizeFormula(value.formula, source),
    pricingSources: arrayOrEmpty(value.pricingSources),
    catalog: {
      generatedAt: typeof catalog.generatedAt === 'string' ? catalog.generatedAt : undefined,
      sources: arrayOrEmpty(catalog.sources)
    }
  }
}

function normalizeCostMode(value: unknown): CostMode {
  return value === 'actual' || value === 'estimated' || value === 'auto' ? value : 'auto'
}

function normalizeFormula(value: unknown, source: CostSource): UsageCostExplanation['formula'] {
  if (value === 'actual' || value === 'estimated' || value === 'mixed' || value === 'unknown') {
    return value
  }
  return costSourceToFormula(source)
}

function costSourceToFormula(source: CostSource): UsageCostExplanation['formula'] {
  if (source === 'actual' || source === 'estimated' || source === 'mixed') return source
  return 'unknown'
}

export function normalizeUsageModelBreakdown(
  value: unknown,
  fallbackSource: CostSource = 'unknown'
): UsageModelBreakdown {
  const record = isRecord(value) ? value : {}
  const cost = numberOrZero(record.cost)
  const tokenUsage = normalizeTokenUsage(record.tokenUsage ?? { totalTokens: record.tokens })

  return {
    model: typeof record.model === 'string' ? record.model : '',
    percentage: numberOrZero(record.percentage),
    cost,
    actualCost: numberOrZero(record.actualCost),
    estimatedCost: numberOrZero(record.estimatedCost),
    costDelta: numberOrZero(record.costDelta),
    costSource: normalizeCostSource(record.costSource ?? fallbackSource, cost),
    pricingMisses: arrayOrEmpty(record.pricingMisses),
    tokens: numberOrZero(record.tokens) || tokenUsage.totalTokens,
    tokenUsage
  }
}

export function normalizeUsageProjectBreakdown(
  value: unknown,
  fallbackSource: CostSource = 'unknown'
): UsageProjectBreakdown {
  const record = isRecord(value) ? value : {}
  const cost = numberOrZero(record.cost)
  const tokenUsage = normalizeTokenUsage(record.tokenUsage ?? { totalTokens: record.tokens })

  return {
    project: typeof record.project === 'string' ? record.project : '',
    percentage: numberOrZero(record.percentage),
    cost,
    actualCost: numberOrZero(record.actualCost),
    estimatedCost: numberOrZero(record.estimatedCost),
    costDelta: numberOrZero(record.costDelta),
    costSource: normalizeCostSource(record.costSource ?? fallbackSource, cost),
    pricingMisses: arrayOrEmpty(record.pricingMisses),
    tokens: numberOrZero(record.tokens) || tokenUsage.totalTokens,
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

function arrayOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
