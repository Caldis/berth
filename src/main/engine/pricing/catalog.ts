import type { ModelPricing } from './types'

export const LITELLM_MODEL_PRICES_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'

const BUILT_IN_MODEL_PRICING: readonly ModelPricing[] = [
  {
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    aliases: ['claude-sonnet-4'],
    inputCostPerToken: 0.000003,
    outputCostPerToken: 0.000015,
    cacheReadInputCostPerToken: 0.0000003,
    cacheCreationInputCostPerToken: 0.00000375,
    source: 'litellm',
    sourceUrl: LITELLM_MODEL_PRICES_URL,
    updatedAt: '2026-05-30'
  }
]

export function getBuiltInPricingCatalog(): readonly ModelPricing[] {
  return BUILT_IN_MODEL_PRICING
}

export function resolveModelPricing(
  model: string | null | undefined,
  pricingCatalog: readonly ModelPricing[] = []
): ModelPricing | undefined {
  if (!model) return undefined
  const requestedKeys = modelKeys(model)

  for (const pricing of [...pricingCatalog, ...BUILT_IN_MODEL_PRICING]) {
    if (pricingKeys(pricing).some((key) => requestedKeys.has(key))) return pricing
  }

  return undefined
}

function pricingKeys(pricing: ModelPricing): string[] {
  const keys = [
    ...modelKeys(pricing.model),
    ...(pricing.provider ? modelKeys(`${pricing.provider}/${pricing.model}`) : [])
  ]

  for (const alias of pricing.aliases ?? []) {
    keys.push(...modelKeys(alias))
    if (pricing.provider) keys.push(...modelKeys(`${pricing.provider}/${alias}`))
  }

  return Array.from(new Set(keys))
}

function modelKeys(value: string): Set<string> {
  const normalized = normalizeModelId(value)
  const keys = new Set<string>([normalized])
  const slashIndex = normalized.lastIndexOf('/')
  if (slashIndex >= 0) keys.add(normalized.slice(slashIndex + 1))
  return keys
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase()
}
