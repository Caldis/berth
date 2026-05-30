import type { CostSource, TokenUsageBreakdown } from '@shared/types/asset'

export type PricingSource = 'litellm' | 'models.dev' | 'local'

export type PricingMissReason =
  | 'missing-model-pricing'
  | 'missing-token-breakdown'
  | 'missing-price-component'

export interface ModelPricing {
  model: string
  provider?: string
  aliases?: string[]
  inputCostPerToken: number
  outputCostPerToken: number
  cacheReadInputCostPerToken?: number
  cacheCreationInputCostPerToken?: number
  reasoningOutputCostPerToken?: number
  source: PricingSource
  sourceUrl?: string
  updatedAt?: string
}

export interface UsageCostInput {
  actualCost?: number | null
  model?: string | null
  tokenUsage: TokenUsageBreakdown
  pricingCatalog?: readonly ModelPricing[]
}

export interface UsageCostResolution {
  cost: number
  source: CostSource
  pricing?: ModelPricing
  reason?: PricingMissReason
}
