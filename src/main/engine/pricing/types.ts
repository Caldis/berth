import type {
  CostMode,
  CostSource,
  PricingMissReason,
  TokenUsageBreakdown,
  UsageCostFormula
} from '@shared/types/asset'

export type PricingSource = 'litellm' | 'models.dev' | 'local'

export interface ModelPricing {
  id?: string
  model: string
  provider?: string
  aliases?: string[]
  inputCostPerToken: number
  outputCostPerToken: number
  cacheReadInputCostPerToken?: number
  cacheCreationInputCostPerToken?: number
  reasoningOutputCostPerToken?: number
  contextWindow?: number
  maxOutputTokens?: number
  source: PricingSource
  sourceUrl?: string
  updatedAt?: string
}

export interface PricingCatalogSource {
  name: PricingSource
  url: string
  fetchedAt: string
}

export interface PricingCatalogSnapshot {
  version: number
  generatedAt: string
  sources: PricingCatalogSource[]
  models: ModelPricing[]
}

export interface UsageCostInput {
  actualCost?: number | null
  costMode?: CostMode
  model?: string | null
  tokenUsage: TokenUsageBreakdown
  pricingCatalog?: readonly ModelPricing[]
}

export interface UsageCostResolution {
  cost: number
  source: CostSource
  actualCost?: number
  estimatedCost?: number
  costDelta?: number
  pricing?: ModelPricing
  formula: UsageCostFormula
  reason?: PricingMissReason
}
