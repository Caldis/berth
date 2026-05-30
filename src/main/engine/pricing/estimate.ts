import type { CostSource, TokenUsageBreakdown } from '@shared/types/asset'
import { resolveModelPricing } from './catalog'
import type { ModelPricing, PricingMissReason, UsageCostInput, UsageCostResolution } from './types'

export function estimateTokenUsageCost(
  tokenUsage: TokenUsageBreakdown,
  pricing: ModelPricing
): number | null {
  const estimate = estimateWithReason(tokenUsage, pricing)
  return estimate.reason ? null : estimate.cost
}

export function resolveUsageCost(input: UsageCostInput): UsageCostResolution {
  const actualCost = normalizeActualCost(input.actualCost)
  if (actualCost != null) return { cost: actualCost, source: 'actual' }

  const pricing = resolveModelPricing(input.model, input.pricingCatalog)
  if (!pricing) {
    return { cost: 0, source: 'unknown', reason: 'missing-model-pricing' }
  }

  const estimate = estimateWithReason(input.tokenUsage, pricing)
  if (estimate.reason) return { cost: 0, source: 'unknown', reason: estimate.reason }
  return { cost: estimate.cost, source: 'estimated', pricing }
}

export function mergeCostSources(sources: readonly CostSource[]): CostSource {
  const seen = new Set(sources)
  if (seen.size === 0 || (seen.size === 1 && seen.has('unknown'))) return 'unknown'
  if (seen.size === 1) return sources[0] ?? 'unknown'
  return 'mixed'
}

function estimateWithReason(
  tokenUsage: TokenUsageBreakdown,
  pricing: ModelPricing
): { cost: number; reason?: PricingMissReason } {
  if (!tokenUsage.hasBreakdown || tokenUsage.unknownTokens > 0) {
    return { cost: 0, reason: 'missing-token-breakdown' }
  }

  const cacheReadCost = componentCost(
    tokenUsage.cacheReadInputTokens,
    pricing.cacheReadInputCostPerToken
  )
  const cacheCreationCost = componentCost(
    tokenUsage.cacheCreationInputTokens,
    pricing.cacheCreationInputCostPerToken
  )

  if (cacheReadCost == null || cacheCreationCost == null) {
    return { cost: 0, reason: 'missing-price-component' }
  }

  return {
    cost:
      tokenUsage.inputTokens * pricing.inputCostPerToken +
      tokenUsage.outputTokens * pricing.outputCostPerToken +
      cacheReadCost +
      cacheCreationCost +
      tokenUsage.reasoningOutputTokens *
        (pricing.reasoningOutputCostPerToken ?? pricing.outputCostPerToken)
  }
}

function componentCost(tokens: number, rate: number | undefined): number | null {
  if (tokens <= 0) return 0
  return rate == null ? null : tokens * rate
}

function normalizeActualCost(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}
