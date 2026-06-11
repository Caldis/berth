import type { CostSource, TokenUsageBreakdown } from '@shared/types/asset'
import { resolveModelPricing } from './catalog'
import type { PricingMissReason } from '@shared/types/asset'
import type { ModelPricing, UsageCostInput, UsageCostResolution } from './types'

export function estimateTokenUsageCost(
  tokenUsage: TokenUsageBreakdown,
  pricing: ModelPricing
): number | null {
  const estimate = estimateWithReason(tokenUsage, pricing)
  return estimate.reason ? null : estimate.cost
}

export function resolveUsageCost(input: UsageCostInput): UsageCostResolution {
  const costMode = input.costMode ?? 'auto'
  const actualCost = normalizeActualCost(input.actualCost)
  const pricing = resolveModelPricing(input.model, input.pricingCatalog)
  const estimate = pricing
    ? estimateWithReason(input.tokenUsage, pricing)
    : { cost: 0, reason: 'missing-model-pricing' as PricingMissReason }
  const estimatedCost = estimate.reason ? undefined : estimate.cost
  const costDelta = actualCost != null && estimatedCost != null ? actualCost - estimatedCost : undefined

  if (costMode === 'actual') {
    if (actualCost != null) {
      return {
        cost: actualCost,
        source: 'actual',
        actualCost,
        estimatedCost,
        costDelta,
        pricing,
        formula: 'actual',
        reason: estimate.reason
      }
    }
    return {
      cost: 0,
      source: 'unknown',
      estimatedCost,
      pricing,
      formula: 'unknown',
      reason: estimate.reason
    }
  }

  if (costMode === 'estimated') {
    if (estimate.reason) {
      return {
        cost: 0,
        source: 'unknown',
        actualCost,
        pricing,
        formula: 'unknown',
        reason: estimate.reason
      }
    }
    return {
      cost: estimate.cost,
      source: 'estimated',
      actualCost,
      estimatedCost: estimate.cost,
      costDelta,
      pricing,
      formula: 'estimated'
    }
  }

  if (actualCost != null) {
    return {
      cost: actualCost,
      source: 'actual',
      actualCost,
      estimatedCost,
      costDelta,
      pricing,
      formula: 'actual',
      reason: estimate.reason
    }
  }

  if (estimate.reason) {
    return { cost: 0, source: 'unknown', pricing, formula: 'unknown', reason: estimate.reason }
  }
  return {
    cost: estimate.cost,
    source: 'estimated',
    estimatedCost: estimate.cost,
    pricing,
    formula: 'estimated'
  }
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
