import type { Asset, UsageSummary } from '@shared/types/asset'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage
} from '@shared/token-usage'

type Numberish = number | null | undefined

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

function summarizeUsageData(usageAssets: Asset[]): UsageSummary {
  let totalCost = 0
  let tokenUsage = emptyTokenUsage()
  const modelMap = new Map<string, { cost: number; tokenUsage: ReturnType<typeof emptyTokenUsage> }>()
  const projectMap = new Map<string, { cost: number; tokenUsage: ReturnType<typeof emptyTokenUsage> }>()
  const dailyMap = new Map<string, number>()

  for (const asset of usageAssets) {
    const cost = readNumber(asset.meta.costUSD, asset.meta.cost) ?? 0
    const entryTokenUsage = normalizeTokenUsage(asset.meta)
    totalCost += cost
    tokenUsage = addTokenUsage(tokenUsage, entryTokenUsage)

    const model = typeof asset.meta.model === 'string' ? asset.meta.model : undefined
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

    const date = typeof asset.meta.date === 'string' ? asset.meta.date : undefined
    if (date && cost > 0) dailyMap.set(date, (dailyMap.get(date) ?? 0) + cost)
  }

  const totalTokens = tokenUsage.totalTokens
  const modelTotal = totalCost > 0 ? totalCost : totalTokens
  const projectTotal = totalCost > 0 ? totalCost : totalTokens

  return {
    totalCost,
    totalTokens,
    tokenUsage,
    costSource: totalCost > 0 ? 'actual' : 'unknown',
    dailyCosts: Array.from(dailyMap, ([date, cost]) => ({ date, cost })).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    dailyTokenUsage: [],
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

function collectDailyModelTokens(meta: Record<string, unknown>): Map<string, number> {
  const result = new Map<string, number>()
  const dailyModelTokens = Array.isArray(meta.dailyModelTokens) ? meta.dailyModelTokens : []

  for (const day of dailyModelTokens) {
    if (!day || typeof day !== 'object') continue
    const tokensByModel = (day as Record<string, unknown>).tokensByModel
    if (!tokensByModel || typeof tokensByModel !== 'object') continue

    for (const [model, value] of Object.entries(tokensByModel as Record<string, unknown>)) {
      const tokens = readNumber(value) ?? 0
      result.set(model, (result.get(model) ?? 0) + tokens)
    }
  }

  return result
}

function summarizeStatsCache(statsAsset: Asset): UsageSummary {
  const meta = statsAsset.meta
  const modelUsage = meta.modelUsage && typeof meta.modelUsage === 'object'
    ? (meta.modelUsage as Record<string, Record<string, unknown>>)
    : {}
  const dailyTokenMap = collectDailyModelTokens(meta)
  const modelEntries = new Map<string, { cost: number; tokenUsage: ReturnType<typeof emptyTokenUsage> }>()

  for (const [model, value] of Object.entries(modelUsage)) {
    const cost = readNumber(value.costUSD, value.cost) ?? 0
    const tokenUsage = normalizeTokenUsage(value)
    modelEntries.set(model, { cost, tokenUsage })
  }

  for (const [model, tokens] of dailyTokenMap) {
    if (!modelEntries.has(model)) {
      modelEntries.set(model, { cost: 0, tokenUsage: normalizeTokenUsage({ tokens }) })
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
      const date = typeof record.date === 'string' ? record.date : undefined
      const cost = readNumber(record.costUSD, record.cost)
      return date && cost != null ? { date, cost } : null
    })
    .filter((entry): entry is { date: string; cost: number } => entry != null && entry.cost > 0)

  return {
    totalCost,
    totalTokens,
    tokenUsage,
    costSource: totalCost > 0 ? 'actual' : 'unknown',
    dailyCosts,
    dailyTokenUsage: [],
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

export function buildUsageSummary(assets: Asset[]): UsageSummary {
  const usageAssets = assets.filter((asset) => asset.type === 'usage-data')
  if (usageAssets.length > 0) return summarizeUsageData(usageAssets)

  const statsAsset = assets.find((asset) => asset.type === 'stats-cache')
  if (statsAsset) return summarizeStatsCache(statsAsset)

  return emptyUsageSummary()
}
