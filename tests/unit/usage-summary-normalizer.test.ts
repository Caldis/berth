import { describe, expect, it } from 'vitest'
import { normalizeUsageSummary } from '../../src/shared/usage-summary'
import type { UsageSummary } from '../../src/shared/types/asset'

describe('normalizeUsageSummary', () => {
  it('fills missing fields from a legacy usage summary', () => {
    const summary = normalizeUsageSummary({
      totalCost: 0,
      totalTokens: 15,
      dailyCosts: [],
      byModel: [
        {
          model: 'legacy-model',
          percentage: 100,
          cost: 0,
          tokens: 15
        }
      ],
      byProject: [
        {
          project: 'legacy-project',
          percentage: 100,
          cost: 0,
          tokens: 15
        }
      ],
      rateLimits: []
    } as unknown as UsageSummary)

    expect(summary).toMatchObject({
      totalCost: 0,
      actualCost: 0,
      estimatedCost: 0,
      costDelta: 0,
      totalTokens: 15,
      costSource: 'unknown',
      pricingMisses: []
    })
    expect(summary.tokenUsage).toMatchObject({
      unknownTokens: 15,
      totalTokens: 15,
      hasBreakdown: false
    })
    expect(summary.byModel[0]).toMatchObject({
      model: 'legacy-model',
      costSource: 'unknown',
      pricingMisses: [],
      tokens: 15,
      tokenUsage: { totalTokens: 15 }
    })
    expect(summary.byProject[0]).toMatchObject({
      project: 'legacy-project',
      costSource: 'unknown',
      pricingMisses: [],
      tokens: 15,
      tokenUsage: { totalTokens: 15 }
    })
  })
})
