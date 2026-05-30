import { describe, expect, it } from 'vitest'
import {
  convertLiteLlmPricingCatalog,
  convertModelsDevCatalog,
  estimateTokenUsageCost,
  loadLocalPricingOverrides,
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

    expect(result).toMatchObject({
      cost: 1.23,
      source: 'actual',
      actualCost: 1.23,
      estimatedCost: 0.2,
      costDelta: 1.03
    })
  })

  it('keeps actual cost while surfacing missing estimate reasons', () => {
    const result = resolveUsageCost({
      actualCost: 1.23,
      model: 'missing-model',
      tokenUsage: normalizeTokenUsage({ inputTokens: 10, outputTokens: 5 }),
      pricingCatalog: [localPricing]
    })

    expect(result).toMatchObject({
      cost: 1.23,
      source: 'actual',
      actualCost: 1.23,
      reason: 'missing-model-pricing'
    })
    expect(result.estimatedCost).toBeUndefined()
    expect(result.costDelta).toBeUndefined()
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

  it('converts LiteLLM per-token pricing fields into internal pricing records', () => {
    const [pricing] = convertLiteLlmPricingCatalog(
      {
        'claude-sonnet-4-20250514': {
          litellm_provider: 'anthropic',
          input_cost_per_token: 0.000003,
          output_cost_per_token: 0.000015,
          cache_read_input_token_cost: 0.0000003,
          cache_creation_input_token_cost: 0.00000375,
          output_cost_per_reasoning_token: 0.000015,
          max_input_tokens: 200000,
          max_output_tokens: 64000
        }
      },
      { sourceUrl: 'https://example.test/litellm.json', updatedAt: '2026-05-30' }
    )

    expect(pricing).toMatchObject({
      id: 'anthropic/claude-sonnet-4-20250514',
      model: 'claude-sonnet-4-20250514',
      provider: 'anthropic',
      inputCostPerToken: 0.000003,
      outputCostPerToken: 0.000015,
      cacheReadInputCostPerToken: 0.0000003,
      cacheCreationInputCostPerToken: 0.00000375,
      reasoningOutputCostPerToken: 0.000015,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      source: 'litellm'
    })
  })

  it('converts models.dev per-million pricing fields into per-token records', () => {
    const [pricing] = convertModelsDevCatalog(
      {
        anthropic: {
          models: {
            'claude-sonnet-4-5': {
              cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, reasoning: 15 },
              limit: { context: 200000, output: 64000 }
            }
          }
        }
      },
      { sourceUrl: 'https://models.dev/api.json', updatedAt: '2026-05-30' }
    )

    expect(pricing).toMatchObject({
      id: 'anthropic/claude-sonnet-4-5',
      inputCostPerToken: 0.000003,
      outputCostPerToken: 0.000015,
      cacheReadInputCostPerToken: 0.0000003,
      cacheCreationInputCostPerToken: 0.00000375,
      reasoningOutputCostPerToken: 0.000015,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      source: 'models.dev'
    })
  })

  it('loads local overrides and resolves them before the built-in catalog', () => {
    const overrides = loadLocalPricingOverrides(
      JSON.stringify({
        models: [
          {
            id: 'anthropic/claude-sonnet-4-20250514',
            model: 'claude-sonnet-4-20250514',
            provider: 'anthropic',
            inputCostPerToken: 0.99,
            outputCostPerToken: 0.99
          }
        ]
      })
    )

    expect(resolveModelPricing('anthropic/claude-sonnet-4-20250514', overrides)).toMatchObject({
      inputCostPerToken: 0.99,
      source: 'local'
    })
  })

  it('normalizes provider prefixes and Bedrock-style model ids', () => {
    expect(resolveModelPricing('us.anthropic.claude-sonnet-4-20250514-v1:0')).toMatchObject({
      id: 'anthropic/claude-sonnet-4-20250514'
    })
    expect(resolveModelPricing('claude-sonnet-4')).toMatchObject({
      id: 'anthropic/claude-sonnet-4-20250514'
    })
  })
})
