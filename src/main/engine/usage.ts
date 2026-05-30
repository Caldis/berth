import type { Asset, CostSource, TokenUsageBreakdown, UsageSummary } from '@shared/types/asset'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage
} from '@shared/token-usage'
import {
  mergeCostSources,
  resolveUsageCost,
  type ModelPricing
} from './pricing'

type Numberish = number | null | undefined
type UsageSummaryOptions = {
  days?: number
  now?: Date | string
  pricingCatalog?: readonly ModelPricing[]
}
type UsageEntry = {
  cost: number
  tokenUsage: TokenUsageBreakdown
}

function emptyUsageSummary(): UsageSummary {
  return {
    totalCost: 0,
    totalTokens: 0,
    tokenUsage: emptyTokenUsage(),
    costSource: 'unknown',
    dailyCosts: [],
    dailyTokenUsage: [],
    byModel: [],
    byProject: [],
    rateLimits: []
  }
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

function percent(part: Numberish, total: number): number {
  if (!part || total <= 0) return 0
  return Math.round((part / total) * 100)
}

function summarizeUsageData(usageAssets: Asset[], options: UsageSummaryOptions): UsageSummary {
  let totalCost = 0
  let tokenUsage = emptyTokenUsage()
  const modelMap = new Map<string, UsageEntry>()
  const projectMap = new Map<string, UsageEntry>()
  const dailyMap = new Map<string, number>()
  const dailyTokenMap = new Map<string, TokenUsageBreakdown>()
  const costSources: CostSource[] = []

  for (const asset of usageAssets) {
    const date = dateFromMeta(asset.meta, 'date')
    if (!dateInRange(date, options)) continue

    const entryTokenUsage = normalizeTokenUsage(asset.meta.tokenUsage ?? asset.meta)
    const model = typeof asset.meta.model === 'string' ? asset.meta.model : undefined
    const costResult = resolveUsageCost({
      actualCost: readNumber(asset.meta.costUSD, asset.meta.totalCost, asset.meta.cost),
      model,
      tokenUsage: entryTokenUsage,
      pricingCatalog: options.pricingCatalog
    })
    const cost = costResult.cost
    costSources.push(costResult.source)
    totalCost += cost
    tokenUsage = addTokenUsage(tokenUsage, entryTokenUsage)

    if (model) {
      const entry = modelMap.get(model) ?? { cost: 0, tokenUsage: emptyTokenUsage() }
      entry.cost += cost
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, entryTokenUsage)
      modelMap.set(model, entry)
    }

    const project = typeof asset.meta.project === 'string' ? asset.meta.project : undefined
    if (project) {
      const entry = projectMap.get(project) ?? { cost: 0, tokenUsage: emptyTokenUsage() }
      entry.cost += cost
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, entryTokenUsage)
      projectMap.set(project, entry)
    }

    if (date) {
      if (cost > 0 && costResult.source !== 'unknown') dailyMap.set(date, (dailyMap.get(date) ?? 0) + cost)
      dailyTokenMap.set(date, addTokenUsage(dailyTokenMap.get(date) ?? emptyTokenUsage(), entryTokenUsage))
    }
  }

  const totalTokens = tokenUsage.totalTokens
  const modelTotal = totalCost > 0 ? totalCost : totalTokens
  const projectTotal = totalCost > 0 ? totalCost : totalTokens

  return {
    totalCost,
    totalTokens,
    tokenUsage,
    costSource: mergeCostSources(costSources),
    dailyCosts: Array.from(dailyMap, ([date, cost]) => ({ date, cost })).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    dailyTokenUsage: Array.from(dailyTokenMap, ([date, tokenUsage]) => ({ date, tokenUsage })).sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
    byModel: Array.from(modelMap, ([model, entry]) => ({
      model,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokenUsage.totalTokens, modelTotal),
      cost: entry.cost,
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    byProject: Array.from(projectMap, ([project, entry]) => ({
      project,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokenUsage.totalTokens, projectTotal),
      cost: entry.cost,
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    rateLimits: []
  }
}

function collectDailyModelTokens(
  meta: Record<string, unknown>,
  options: UsageSummaryOptions
): Map<string, number> {
  const result = new Map<string, number>()
  const dailyModelTokens = Array.isArray(meta.dailyModelTokens) ? meta.dailyModelTokens : []

  for (const day of dailyModelTokens) {
    if (!day || typeof day !== 'object') continue
    const record = day as Record<string, unknown>
    if (!dateInRange(dateFromMeta(record, 'date'), options)) continue
    const tokensByModel = record.tokensByModel
    if (!tokensByModel || typeof tokensByModel !== 'object') continue

    for (const [model, value] of Object.entries(tokensByModel as Record<string, unknown>)) {
      const tokens = readNumber(value) ?? 0
      result.set(model, (result.get(model) ?? 0) + tokens)
    }
  }

  return result
}

function summarizeStatsCache(statsAsset: Asset, options: UsageSummaryOptions): UsageSummary {
  const meta = statsAsset.meta
  const modelUsage = meta.modelUsage && typeof meta.modelUsage === 'object'
    ? (meta.modelUsage as Record<string, Record<string, unknown>>)
    : {}
  const dailyTokenMap = collectDailyModelTokens(meta, options)
  const modelEntries = new Map<string, UsageEntry>()
  const costSources: CostSource[] = []

  for (const [model, value] of Object.entries(modelUsage)) {
    const tokenUsage = normalizeTokenUsage(value)
    const costResult = resolveUsageCost({
      actualCost: readNumber(value.costUSD, value.totalCost, value.cost),
      model,
      tokenUsage,
      pricingCatalog: options.pricingCatalog
    })
    const cost = costResult.cost
    costSources.push(costResult.source)
    modelEntries.set(model, { cost, tokenUsage })
  }

  for (const [model, tokens] of dailyTokenMap) {
    if (!modelEntries.has(model)) {
      const tokenUsage = normalizeTokenUsage({ tokens })
      const costResult = resolveUsageCost({
        model,
        tokenUsage,
        pricingCatalog: options.pricingCatalog
      })
      costSources.push(costResult.source)
      modelEntries.set(model, { cost: costResult.cost, tokenUsage })
    }
  }

  const totalCost = Array.from(modelEntries.values()).reduce((sum, entry) => sum + entry.cost, 0)
  const tokenUsage = Array.from(modelEntries.values()).reduce(
    (sum, entry) => addTokenUsage(sum, entry.tokenUsage),
    emptyTokenUsage()
  )
  const totalTokens = tokenUsage.totalTokens
  const distributionTotal = totalCost > 0 ? totalCost : totalTokens

  const dailyCosts = (Array.isArray(meta.dailyActivity) ? meta.dailyActivity : [])
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const date = dateFromMeta(record, 'date')
      if (!dateInRange(date, options)) return null
      const cost = readNumber(record.costUSD, record.cost)
      return date && cost != null ? { date, cost } : null
    })
    .filter((entry): entry is { date: string; cost: number } => entry != null && entry.cost > 0)
  const dailyTokenUsage = Array.from(dailyTokenMap, ([date, tokens]) => ({
    date,
    tokenUsage: normalizeTokenUsage({ tokens })
  })).sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalCost,
    totalTokens,
    tokenUsage,
    costSource: mergeCostSources(costSources),
    dailyCosts,
    dailyTokenUsage,
    byModel: Array.from(modelEntries, ([model, entry]) => ({
      model,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokenUsage.totalTokens, distributionTotal),
      cost: entry.cost,
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    byProject: [],
    rateLimits: []
  }
}

function summarizeSessions(sessionAssets: Asset[], options: UsageSummaryOptions): UsageSummary {
  return summarizeUsageData(
    sessionAssets.map((asset) => ({
      ...asset,
      type: 'usage-data',
      meta: {
        ...asset.meta,
        date: dateFromMeta(asset.meta, 'startedAt') ?? dateFromMeta(asset.meta, 'endedAt'),
        cost: readNumber(asset.meta.totalCost, asset.meta.cost),
        tokenUsage: asset.meta.tokenUsage,
        totalTokens: asset.meta.totalTokens,
        model: typeof asset.meta.model === 'string' ? asset.meta.model : undefined,
        project: typeof asset.meta.project === 'string' ? asset.meta.project : undefined
      }
    })),
    options
  )
}

export function buildUsageSummary(
  assets: Asset[],
  options: UsageSummaryOptions = {}
): UsageSummary {
  const usageAssets = assets.filter((asset) => asset.type === 'usage-data')
  if (usageAssets.length > 0) return summarizeUsageData(usageAssets, options)

  const statsAsset = assets.find((asset) => asset.type === 'stats-cache')
  if (statsAsset) return summarizeStatsCache(statsAsset, options)

  const sessionAssets = assets.filter((asset) => asset.type === 'session')
  if (sessionAssets.length > 0) return summarizeSessions(sessionAssets, options)

  return emptyUsageSummary()
}

function dateFromMeta(meta: Record<string, unknown>, key: string): string | undefined {
  const value = meta[key]
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return value.slice(0, 10)
}

function dateInRange(date: string | undefined, options: UsageSummaryOptions): boolean {
  if (!date || !options.days || options.days <= 0) return true
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now())
  if (Number.isNaN(now.getTime())) return true
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const candidate = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(candidate.getTime())) return true
  const start = new Date(current)
  start.setUTCDate(start.getUTCDate() - options.days + 1)
  return candidate >= start && candidate <= current
}
