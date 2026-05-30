import type { ModelPricing } from './types'
import { PRICING_CATALOG_SNAPSHOT } from './catalog.generated'
import { modelMatchKeys, normalizeModelId } from './model-match'

export const LITELLM_MODEL_PRICES_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

export const MODELS_DEV_API_URL = 'https://models.dev/api.json'

const BUILT_IN_MODEL_PRICING: readonly ModelPricing[] = PRICING_CATALOG_SNAPSHOT.models

export function getBuiltInPricingCatalog(): readonly ModelPricing[] {
  return BUILT_IN_MODEL_PRICING
}

export function resolveModelPricing(
  model: string | null | undefined,
  pricingCatalog: readonly ModelPricing[] = []
): ModelPricing | undefined {
  if (!model) return undefined
  const requestedKeys = modelMatchKeys(model)
  let bestMatch: { pricing: ModelPricing; score: number; sourceScore: number } | undefined

  for (const pricing of [...pricingCatalog, ...BUILT_IN_MODEL_PRICING]) {
    const score = pricingMatchScore(pricing, requestedKeys)
    if (score === 0) continue

    const sourceScore = pricingSourceScore(pricing)
    if (
      !bestMatch ||
      score > bestMatch.score ||
      (score === bestMatch.score && sourceScore > bestMatch.sourceScore)
    ) {
      bestMatch = { pricing, score, sourceScore }
    }
  }

  return bestMatch?.pricing
}

function pricingMatchScore(pricing: ModelPricing, requestedKeys: Set<string>): number {
  const model = normalizeModelId(pricing.model)
  const provider = pricing.provider ? normalizeModelId(pricing.provider) : undefined

  if (pricing.id && requestedKeys.has(normalizeModelId(pricing.id))) return 100
  if (provider && requestedKeys.has(`${provider}/${model}`)) return 90

  for (const alias of pricing.aliases ?? []) {
    const normalizedAlias = normalizeModelId(alias)
    if (provider && requestedKeys.has(`${provider}/${normalizedAlias}`)) return 80
    if (requestedKeys.has(normalizedAlias)) return 70
  }

  if (requestedKeys.has(model)) return 10
  return 0
}

function pricingSourceScore(pricing: ModelPricing): number {
  if (pricing.source === 'local') return 3
  if (pricing.source === 'litellm') return 2
  return 1
}
