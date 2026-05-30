import type {
  Asset,
  CostSource,
  PricingMiss,
  TokenUsageBreakdown,
  UsageCostDetails,
  UsageSummary
} from '@shared/types/asset'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage
} from '@shared/token-usage'
import {
  mergeCostSources,
  resolveUsageCost,
  type ModelPricing,
  type UsageCostResolution
} from './pricing'

type Numberish = number | null | undefined
type UsageSummaryOptions = {
  days?: number
  now?: Date | string
  pricingCatalog?: readonly ModelPricing[]
}
type UsageEntry = {
  cost: number
  actualCost: number
  estimatedCost: number
  costDelta: number
  costSources: CostSource[]
  pricingMisses: PricingMiss[]
  tokenUsage: TokenUsageBreakdown
}

function emptyUsageSummary(): UsageSummary {
  return {
    totalCost: 0,
    actualCost: 0,
    estimatedCost: 0,
    costDelta: 0,
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
  let costDetails = emptyCostDetails()
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
    costDetails = addCostDetails(costDetails, costResult)
    costSources.push(costResult.source)
    totalCost += cost
    tokenUsage = addTokenUsage(tokenUsage, entryTokenUsage)

    if (model) {
      const entry = modelMap.get(model) ?? emptyUsageEntry()
      addCostResultToEntry(entry, costResult, model, entryTokenUsage)
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, entryTokenUsage)
      modelMap.set(model, entry)
    }

    const project = typeof asset.meta.project === 'string' ? asset.meta.project : undefined
    if (project) {
      const entry = projectMap.get(project) ?? emptyUsageEntry()
      addCostResultToEntry(entry, costResult, model, entryTokenUsage)
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, entryTokenUsage)
      projectMap.set(project, entry)
    }

    if (date) {
      if (cost > 0 && costResult.source !== 'unknown') dailyMap.set(date, (dailyMap.get(date) ?? 0) + cost)
      dailyTokenMap.set(date, addTokenUsage(dailyTokenMap.get(date) ?? emptyTokenUsage(), entryTokenUsage))
    }
  }

  const totalTokens = tokenUsage.totalTokens

  return {
    totalCost,
    ...costDetails,
    totalTokens,
    tokenUsage,
    costSource: mergeCostSources(costSources),
    pricingMisses: mergePricingMisses([...modelMap.values()].flatMap((entry) => entry.pricingMisses)),
    dailyCosts: Array.from(dailyMap, ([date, cost]) => ({ date, cost })).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    dailyTokenUsage: Array.from(dailyTokenMap, ([date, tokenUsage]) => ({ date, tokenUsage })).sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
    byModel: Array.from(modelMap, ([model, entry]) => ({
      model,
      percentage: percent(entry.tokenUsage.totalTokens, totalTokens),
      cost: entry.cost,
      ...entryCostDetails(entry),
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    byProject: Array.from(projectMap, ([project, entry]) => ({
      project,
      percentage: percent(entry.tokenUsage.totalTokens, totalTokens),
      cost: entry.cost,
      ...entryCostDetails(entry),
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    rateLimits: []
  }
}

function collectDailyModelTokens(
  meta: Record<string, unknown>,
  options: UsageSummaryOptions
): { byModel: Map<string, number>; byDate: Map<string, TokenUsageBreakdown> } {
  const byModel = new Map<string, number>()
  const byDate = new Map<string, TokenUsageBreakdown>()
  const dailyModelTokens = Array.isArray(meta.dailyModelTokens) ? meta.dailyModelTokens : []

  for (const day of dailyModelTokens) {
    if (!day || typeof day !== 'object') continue
    const record = day as Record<string, unknown>
    const date = dateFromMeta(record, 'date')
    if (!dateInRange(date, options)) continue
    const tokensByModel = record.tokensByModel
    if (!tokensByModel || typeof tokensByModel !== 'object') continue

    let dailyTokenUsage = emptyTokenUsage()
    for (const [model, value] of Object.entries(tokensByModel as Record<string, unknown>)) {
      const tokens = readNumber(value) ?? 0
      byModel.set(model, (byModel.get(model) ?? 0) + tokens)
      dailyTokenUsage = addTokenUsage(dailyTokenUsage, normalizeTokenUsage({ tokens }))
    }
    if (date) byDate.set(date, addTokenUsage(byDate.get(date) ?? emptyTokenUsage(), dailyTokenUsage))
  }

  return { byModel, byDate }
}

function summarizeStatsCache(statsAsset: Asset, options: UsageSummaryOptions): UsageSummary {
  const meta = statsAsset.meta
  const modelUsage = meta.modelUsage && typeof meta.modelUsage === 'object'
    ? (meta.modelUsage as Record<string, Record<string, unknown>>)
    : {}
  const dailyTokenMap = collectDailyModelTokens(meta, options)
  const modelEntries = new Map<string, UsageEntry>()
  let costDetails = emptyCostDetails()
  const costSources: CostSource[] = []

  for (const [model, value] of Object.entries(modelUsage)) {
    const tokenUsage = normalizeTokenUsage(value)
    const costResult = resolveUsageCost({
      actualCost: readNumber(value.costUSD, value.totalCost, value.cost),
      model,
      tokenUsage,
      pricingCatalog: options.pricingCatalog
    })
    costDetails = addCostDetails(costDetails, costResult)
    costSources.push(costResult.source)
    const entry = emptyUsageEntry()
    addCostResultToEntry(entry, costResult, model, tokenUsage)
    entry.tokenUsage = tokenUsage
    modelEntries.set(model, entry)
  }

  for (const [model, tokens] of dailyTokenMap.byModel) {
    if (!modelEntries.has(model)) {
      const tokenUsage = normalizeTokenUsage({ tokens })
      const costResult = resolveUsageCost({
        model,
        tokenUsage,
        pricingCatalog: options.pricingCatalog
      })
      costDetails = addCostDetails(costDetails, costResult)
      costSources.push(costResult.source)
      const entry = emptyUsageEntry()
      addCostResultToEntry(entry, costResult, model, tokenUsage)
      entry.tokenUsage = tokenUsage
      modelEntries.set(model, entry)
    }
  }

  const totalCost = Array.from(modelEntries.values()).reduce((sum, entry) => sum + entry.cost, 0)
  const tokenUsage = Array.from(modelEntries.values()).reduce(
    (sum, entry) => addTokenUsage(sum, entry.tokenUsage),
    emptyTokenUsage()
  )
  const totalTokens = tokenUsage.totalTokens

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
  const dailyTokenUsage = Array.from(dailyTokenMap.byDate, ([date, tokenUsage]) => ({
    date,
    tokenUsage
  })).sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalCost,
    ...costDetails,
    totalTokens,
    tokenUsage,
    costSource: mergeCostSources(costSources),
    pricingMisses: mergePricingMisses(
      Array.from(modelEntries.values()).flatMap((entry) => entry.pricingMisses)
    ),
    dailyCosts,
    dailyTokenUsage,
    byModel: Array.from(modelEntries, ([model, entry]) => ({
      model,
      percentage: percent(entry.tokenUsage.totalTokens, totalTokens),
      cost: entry.cost,
      ...entryCostDetails(entry),
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
  const groups = new Map<string, Asset[]>()
  for (const asset of assets) {
    const group = groups.get(asset.agentId) ?? []
    group.push(asset)
    groups.set(asset.agentId, group)
  }

  return mergeUsageSummaries(
    Array.from(groups.values())
      .map((group) => summarizeAssetGroup(group, options))
      .filter(hasSummaryData)
  )
}

function summarizeAssetGroup(assets: Asset[], options: UsageSummaryOptions): UsageSummary {
  const usageAssets = assets.filter((asset) => asset.type === 'usage-data')
  if (usageAssets.length > 0) return summarizeUsageData(usageAssets, options)

  const statsAsset = assets.find((asset) => asset.type === 'stats-cache')
  if (statsAsset) return summarizeStatsCache(statsAsset, options)

  const sessionAssets = assets.filter((asset) => asset.type === 'session')
  if (sessionAssets.length > 0) return summarizeSessions(sessionAssets, options)

  return emptyUsageSummary()
}

function mergeUsageSummaries(summaries: UsageSummary[]): UsageSummary {
  if (summaries.length === 0) return emptyUsageSummary()

  let totalCost = 0
  let costDetails = emptyCostDetails()
  let tokenUsage = emptyTokenUsage()
  const dailyMap = new Map<string, number>()
  const dailyTokenMap = new Map<string, TokenUsageBreakdown>()
  const modelMap = new Map<string, UsageEntry>()
  const projectMap = new Map<string, UsageEntry>()
  const costSources: CostSource[] = []
  const rateLimits: UsageSummary['rateLimits'] = []

  for (const summary of summaries) {
    totalCost += summary.totalCost
    costDetails = addCostDetails(costDetails, summary)
    tokenUsage = addTokenUsage(tokenUsage, summary.tokenUsage)
    costSources.push(summary.costSource)
    rateLimits.push(...summary.rateLimits)

    for (const day of summary.dailyCosts) {
      dailyMap.set(day.date, (dailyMap.get(day.date) ?? 0) + day.cost)
    }
    for (const day of summary.dailyTokenUsage) {
      dailyTokenMap.set(
        day.date,
        addTokenUsage(dailyTokenMap.get(day.date) ?? emptyTokenUsage(), day.tokenUsage)
      )
    }
    for (const item of summary.byModel) {
      const entry = modelMap.get(item.model) ?? emptyUsageEntry()
      addSummaryItemToEntry(entry, item)
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, item.tokenUsage)
      modelMap.set(item.model, entry)
    }
    for (const item of summary.byProject) {
      const entry = projectMap.get(item.project) ?? emptyUsageEntry()
      addSummaryItemToEntry(entry, item)
      entry.tokenUsage = addTokenUsage(entry.tokenUsage, item.tokenUsage)
      projectMap.set(item.project, entry)
    }
  }

  const totalTokens = tokenUsage.totalTokens
  return {
    totalCost,
    ...costDetails,
    totalTokens,
    tokenUsage,
    costSource: mergeCostSources(costSources),
    pricingMisses: mergePricingMisses(summaries.flatMap((summary) => summary.pricingMisses)),
    dailyCosts: Array.from(dailyMap, ([date, cost]) => ({ date, cost })).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    dailyTokenUsage: Array.from(dailyTokenMap, ([date, tokenUsage]) => ({ date, tokenUsage })).sort(
      (a, b) => a.date.localeCompare(b.date)
    ),
    byModel: Array.from(modelMap, ([model, entry]) => ({
      model,
      percentage: percent(entry.tokenUsage.totalTokens, totalTokens),
      cost: entry.cost,
      ...entryCostDetails(entry),
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    byProject: Array.from(projectMap, ([project, entry]) => ({
      project,
      percentage: percent(entry.tokenUsage.totalTokens, totalTokens),
      cost: entry.cost,
      ...entryCostDetails(entry),
      tokens: entry.tokenUsage.totalTokens,
      tokenUsage: entry.tokenUsage
    })),
    rateLimits
  }
}

function emptyCostDetails(): UsageCostDetails {
  return { actualCost: 0, estimatedCost: 0, costDelta: 0 }
}

function emptyUsageEntry(): UsageEntry {
  return {
    cost: 0,
    ...emptyCostDetails(),
    costSources: [],
    pricingMisses: [],
    tokenUsage: emptyTokenUsage()
  }
}

function addCostDetails<T extends Partial<UsageCostDetails>>(
  current: UsageCostDetails,
  next: T
): UsageCostDetails {
  return {
    actualCost: current.actualCost + (next.actualCost ?? 0),
    estimatedCost: current.estimatedCost + (next.estimatedCost ?? 0),
    costDelta: current.costDelta + (next.costDelta ?? 0)
  }
}

function addCostResultToEntry(
  entry: UsageEntry,
  result: UsageCostResolution,
  model: string | undefined,
  tokenUsage: TokenUsageBreakdown
): void {
  entry.cost += result.cost
  entry.actualCost += result.actualCost ?? 0
  entry.estimatedCost += result.estimatedCost ?? 0
  entry.costDelta += result.costDelta ?? 0
  entry.costSources.push(result.source)
  const miss = pricingMissFromResult(result, model, tokenUsage)
  if (miss) entry.pricingMisses.push(miss)
}

function addSummaryItemToEntry(entry: UsageEntry, item: UsageEntrySummary): void {
  entry.cost += item.cost
  entry.actualCost += item.actualCost
  entry.estimatedCost += item.estimatedCost
  entry.costDelta += item.costDelta
  entry.costSources.push(item.costSource)
  entry.pricingMisses.push(...item.pricingMisses)
}

function entryCostDetails(entry: UsageEntry): UsageCostDetails & {
  costSource: CostSource
  pricingMisses: PricingMiss[]
} {
  return {
    actualCost: entry.actualCost,
    estimatedCost: entry.estimatedCost,
    costDelta: entry.costDelta,
    costSource: mergeCostSources(entry.costSources),
    pricingMisses: mergePricingMisses(entry.pricingMisses)
  }
}

function pricingMissFromResult(
  result: UsageCostResolution,
  model: string | undefined,
  tokenUsage: TokenUsageBreakdown
): PricingMiss | undefined {
  if (!result.reason) return undefined
  return {
    model: model ?? null,
    reason: result.reason,
    tokens: tokenUsage.totalTokens,
    count: 1
  }
}

function mergePricingMisses(misses: readonly PricingMiss[]): PricingMiss[] {
  const merged = new Map<string, PricingMiss>()
  for (const miss of misses) {
    const key = `${miss.model ?? ''}\0${miss.reason}`
    const entry = merged.get(key) ?? { ...miss, tokens: 0, count: 0 }
    entry.tokens += miss.tokens
    entry.count += miss.count
    merged.set(key, entry)
  }
  return Array.from(merged.values())
}

type UsageEntrySummary = Pick<
  UsageSummary['byModel'][number],
  'cost' | 'actualCost' | 'estimatedCost' | 'costDelta' | 'costSource' | 'pricingMisses'
>

function hasSummaryData(summary: UsageSummary): boolean {
  return (
    summary.totalCost > 0 ||
    summary.totalTokens > 0 ||
    summary.byModel.length > 0 ||
    summary.byProject.length > 0 ||
    summary.dailyCosts.length > 0 ||
    summary.dailyTokenUsage.length > 0 ||
    summary.rateLimits.length > 0
  )
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
