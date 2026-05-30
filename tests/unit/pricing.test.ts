import { describe, expect, it } from 'vitest'
import {
  estimateTokenUsageCost,
  resolveModelPricing,
  resolveUsageCost
} from '../../src/main/engine/pricing'
import type { ModelPricing } from '../../src/main/engine/pricing'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

const localPricing: ModelPricing = {
  model: 'priced-model',
  provider: 'test',
  inputCostPerToken: 0.01,
  outputCostPerToken: 0.02,
  cacheReadInputCostPerToken: 0.001,
  cacheCreationInputCostPerToken: 0.005,
  source: 'local'
}

describe('pricing', () => {
  it('keeps actual cost instead of estimating from tokens', () => {
    const result = resolveUsageCost({
      actualCost: 1.23,
      model: 'priced-model',
      tokenUsage: normalizeTokenUsage({ inputTokens: 10, outputTokens: 5 }),
      pricingCatalog: [localPricing]
    })

    expect(result).toMatchObject({ cost: 1.23, source: 'actual' })
  })

  it('estimates cost from local pricing and full token breakdown', () => {
    const tokenUsage = normalizeTokenUsage({
      inputTokens: 10,
      outputTokens: 2,
      cacheReadInputTokens: 3,
      cacheCreationInputTokens: 4,
      reasoningOutputTokens: 5
    })

    expect(estimateTokenUsageCost(tokenUsage, localPricing)).toBeCloseTo(0.263, 6)
    expect(
      resolveUsageCost({
        model: 'test/priced-model',
        tokenUsage,
        pricingCatalog: [localPricing]
      })
    ).toMatchObject({ cost: 0.263, source: 'estimated' })
  })

  it('returns unknown when pricing or token breakdown is missing', () => {
    expect(
      resolveUsageCost({
        model: 'missing-model',
        tokenUsage: normalizeTokenUsage({ inputTokens: 10, outputTokens: 5 }),
        pricingCatalog: [localPricing]
      })
    ).toMatchObject({ cost: 0, source: 'unknown', reason: 'missing-model-pricing' })

    expect(
      resolveUsageCost({
        model: 'priced-model',
        tokenUsage: normalizeTokenUsage({ totalTokens: 15 }),
        pricingCatalog: [localPricing]
      })
    ).toMatchObject({ cost: 0, source: 'unknown', reason: 'missing-token-breakdown' })
  })

  it('resolves built-in LiteLLM pricing by provider-prefixed model id', () => {
    const pricing = resolveModelPricing('anthropic/claude-sonnet-4-20250514')

    expect(pricing).toMatchObject({
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      inputCostPerToken: 0.000003,
      outputCostPerToken: 0.000015,
      cacheReadInputCostPerToken: 0.0000003,
      cacheCreationInputCostPerToken: 0.00000375,
      source: 'litellm'
    })
  })
})
