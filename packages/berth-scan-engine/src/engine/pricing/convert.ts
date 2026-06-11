import type { ModelPricing } from './types'

export interface CatalogConversionOptions {
  sourceUrl?: string
  updatedAt?: string
}

export function convertLiteLlmPricingCatalog(
  raw: unknown,
  options: CatalogConversionOptions = {}
): ModelPricing[] {
  const catalog = asRecord(raw)
  if (!catalog) return []

  return Object.entries(catalog).flatMap(([modelId, value]) => {
    if (modelId === 'sample_spec') return []
    const record = asRecord(value)
    if (!record) return []

    const inputCostPerToken = finiteNumber(record.input_cost_per_token)
    const outputCostPerToken = finiteNumber(record.output_cost_per_token)
    if (inputCostPerToken == null || outputCostPerToken == null) return []

    const provider = stringValue(record.litellm_provider) ?? inferProvider(modelId)
    const model = stripProviderPrefix(modelId, provider)

    return [
      pruneUndefined({
        id: provider ? `${provider}/${model}` : model,
        model,
        provider,
        inputCostPerToken,
        outputCostPerToken,
        cacheReadInputCostPerToken: finiteNumber(record.cache_read_input_token_cost),
        cacheCreationInputCostPerToken: finiteNumber(record.cache_creation_input_token_cost),
        reasoningOutputCostPerToken: finiteNumber(record.output_cost_per_reasoning_token),
        contextWindow: finiteNumber(record.max_input_tokens) ?? finiteNumber(record.max_tokens),
        maxOutputTokens: finiteNumber(record.max_output_tokens) ?? finiteNumber(record.max_tokens),
        source: 'litellm' as const,
        sourceUrl: options.sourceUrl,
        updatedAt: options.updatedAt
      })
    ]
  })
}

export function convertModelsDevCatalog(
  raw: unknown,
  options: CatalogConversionOptions = {}
): ModelPricing[] {
  const providers = asRecord(raw)
  if (!providers) return []

  const records: ModelPricing[] = []
  for (const [provider, providerValue] of Object.entries(providers)) {
    const providerRecord = asRecord(providerValue)
    const models = asRecord(providerRecord?.models)
    if (!models) continue

    for (const [modelId, modelValue] of Object.entries(models)) {
      const modelRecord = asRecord(modelValue)
      const cost = asRecord(modelRecord?.cost)
      if (!modelRecord || !cost) continue

      const input = millionTokenCost(cost.input)
      const output = millionTokenCost(cost.output)
      if (input == null || output == null) continue

      const limit = asRecord(modelRecord.limit)
      const model = stringValue(modelRecord.id) ?? modelId

      records.push(
        pruneUndefined({
          id: `${provider}/${model}`,
          model,
          provider,
          inputCostPerToken: input,
          outputCostPerToken: output,
          cacheReadInputCostPerToken: millionTokenCost(cost.cache_read),
          cacheCreationInputCostPerToken: millionTokenCost(cost.cache_write),
          reasoningOutputCostPerToken: millionTokenCost(cost.reasoning),
          contextWindow: finiteNumber(limit?.context),
          maxOutputTokens: finiteNumber(limit?.output),
          source: 'models.dev' as const,
          sourceUrl: options.sourceUrl,
          updatedAt: options.updatedAt ?? stringValue(modelRecord.last_updated)
        })
      )
    }
  }

  return records
}

export function loadLocalPricingOverrides(raw: string | null | undefined): ModelPricing[] {
  if (!raw?.trim()) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    const models = Array.isArray(parsed) ? parsed : asRecord(parsed)?.models
    if (!Array.isArray(models)) return []

    return models.flatMap((value) => {
      const record = asRecord(value)
      if (!record) return []

      const inputCostPerToken = finiteNumber(record.inputCostPerToken)
      const outputCostPerToken = finiteNumber(record.outputCostPerToken)
      const id = stringValue(record.id)
      const model = stringValue(record.model) ?? inferModelFromId(id)
      if (!model || inputCostPerToken == null || outputCostPerToken == null) return []

      const provider = stringValue(record.provider) ?? inferProvider(id)

      return [
        pruneUndefined({
          id: id ?? (provider ? `${provider}/${model}` : model),
          model,
          provider,
          aliases: stringArray(record.aliases),
          inputCostPerToken,
          outputCostPerToken,
          cacheReadInputCostPerToken: finiteNumber(record.cacheReadInputCostPerToken),
          cacheCreationInputCostPerToken: finiteNumber(record.cacheCreationInputCostPerToken),
          reasoningOutputCostPerToken: finiteNumber(record.reasoningOutputCostPerToken),
          contextWindow: finiteNumber(record.contextWindow),
          maxOutputTokens: finiteNumber(record.maxOutputTokens),
          source: 'local' as const,
          sourceUrl: stringValue(record.sourceUrl),
          updatedAt: stringValue(record.updatedAt)
        })
      ]
    })
  } catch {
    return []
  }
}

function millionTokenCost(value: unknown): number | undefined {
  const cost = finiteNumber(value)
  return cost == null ? undefined : cost / 1_000_000
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value.map(stringValue).filter((item): item is string => Boolean(item))
  return values.length > 0 ? values : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function inferProvider(modelId: string | undefined): string | undefined {
  const id = modelId?.trim().toLowerCase()
  if (!id) return undefined

  const slashIndex = id.indexOf('/')
  if (slashIndex > 0) return id.slice(0, slashIndex)

  const dotIndex = id.indexOf('.')
  if (dotIndex > 0) return id.slice(0, dotIndex)

  return undefined
}

function inferModelFromId(id: string | undefined): string | undefined {
  if (!id) return undefined
  const slashIndex = id.lastIndexOf('/')
  return slashIndex >= 0 ? id.slice(slashIndex + 1) : id
}

function stripProviderPrefix(modelId: string, provider: string | undefined): string {
  const normalized = modelId.trim().toLowerCase()
  if (provider && normalized.startsWith(`${provider}/`)) return normalized.slice(provider.length + 1)
  return normalized
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) delete value[key]
  }
  return value
}
