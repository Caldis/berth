import type { Asset, UsageSummary } from '@shared/types/asset'

type Numberish = number | null | undefined

function emptyUsageSummary(): UsageSummary {
  return {
    totalCost: 0,
    totalTokens: 0,
    dailyCosts: [],
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

function tokenTotal(meta: Record<string, unknown>): number {
  return (
    (readNumber(meta.totalTokens) ?? 0) ||
    (readNumber(meta.tokens) ?? 0) ||
    (readNumber(meta.inputTokens) ?? 0) +
      (readNumber(meta.outputTokens) ?? 0) +
      (readNumber(meta.cacheReadInputTokens) ?? 0) +
      (readNumber(meta.cacheCreationInputTokens) ?? 0)
  )
}

function summarizeUsageData(usageAssets: Asset[]): UsageSummary {
  let totalCost = 0
  let totalTokens = 0
  const modelMap = new Map<string, { cost: number; tokens: number }>()
  const projectMap = new Map<string, { cost: number; tokens: number }>()
  const dailyMap = new Map<string, number>()

  for (const asset of usageAssets) {
    const cost = readNumber(asset.meta.costUSD, asset.meta.cost) ?? 0
    const tokens = tokenTotal(asset.meta)
    totalCost += cost
    totalTokens += tokens

    const model = typeof asset.meta.model === 'string' ? asset.meta.model : undefined
    if (model) {
      const entry = modelMap.get(model) ?? { cost: 0, tokens: 0 }
      entry.cost += cost
      entry.tokens += tokens
      modelMap.set(model, entry)
    }

    const project = typeof asset.meta.project === 'string' ? asset.meta.project : undefined
    if (project) {
      const entry = projectMap.get(project) ?? { cost: 0, tokens: 0 }
      entry.cost += cost
      entry.tokens += tokens
      projectMap.set(project, entry)
    }

    const date = typeof asset.meta.date === 'string' ? asset.meta.date : undefined
    if (date && cost > 0) dailyMap.set(date, (dailyMap.get(date) ?? 0) + cost)
  }

  const modelTotal = totalCost > 0 ? totalCost : totalTokens
  const projectTotal = totalCost > 0 ? totalCost : totalTokens

  return {
    totalCost,
    totalTokens,
    dailyCosts: Array.from(dailyMap, ([date, cost]) => ({ date, cost })).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    byModel: Array.from(modelMap, ([model, entry]) => ({
      model,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokens, modelTotal),
      cost: entry.cost
    })),
    byProject: Array.from(projectMap, ([project, entry]) => ({
      project,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokens, projectTotal),
      cost: entry.cost
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
  const modelEntries = new Map<string, { cost: number; tokens: number }>()

  for (const [model, value] of Object.entries(modelUsage)) {
    const cost = readNumber(value.costUSD, value.cost) ?? 0
    const tokens = tokenTotal(value)
    modelEntries.set(model, { cost, tokens })
  }

  for (const [model, tokens] of dailyTokenMap) {
    if (!modelEntries.has(model)) modelEntries.set(model, { cost: 0, tokens })
  }

  const totalCost = Array.from(modelEntries.values()).reduce((sum, entry) => sum + entry.cost, 0)
  const totalTokens = Array.from(modelEntries.values()).reduce((sum, entry) => sum + entry.tokens, 0)
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
    dailyCosts,
    byModel: Array.from(modelEntries, ([model, entry]) => ({
      model,
      percentage: percent(totalCost > 0 ? entry.cost : entry.tokens, distributionTotal),
      cost: entry.cost
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
