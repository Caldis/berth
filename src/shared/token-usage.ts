import type { TokenUsageBreakdown } from './types/asset'

const TOKEN_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadInputTokens',
  'cacheCreationInputTokens',
  'reasoningOutputTokens',
  'unknownTokens'
] as const

type TokenField = (typeof TOKEN_FIELDS)[number]

const FIELD_ALIASES: Record<TokenField, string[]> = {
  inputTokens: ['inputTokens', 'input_tokens'],
  outputTokens: ['outputTokens', 'output_tokens'],
  cacheReadInputTokens: [
    'cacheReadInputTokens',
    'cache_read_input_tokens',
    'cacheReadTokens',
    'cache_read_tokens',
    'cachedInputTokens',
    'cached_input_tokens'
  ],
  cacheCreationInputTokens: [
    'cacheCreationInputTokens',
    'cache_creation_input_tokens',
    'cacheCreationTokens',
    'cache_creation_tokens',
    'cacheWriteInputTokens',
    'cache_write_input_tokens'
  ],
  reasoningOutputTokens: ['reasoningOutputTokens', 'reasoning_output_tokens'],
  unknownTokens: ['unknownTokens', 'unknown_tokens']
}

const TOTAL_ALIASES = ['totalTokens', 'total_tokens', 'tokens']

export function emptyTokenUsage(): TokenUsageBreakdown {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    reasoningOutputTokens: 0,
    unknownTokens: 0,
    totalTokens: 0,
    hasBreakdown: false
  }
}

export function normalizeTokenUsage(value: unknown): TokenUsageBreakdown {
  if (!isRecord(value)) return emptyTokenUsage()

  const inputTokens = readNumber(value, FIELD_ALIASES.inputTokens) ?? 0
  const outputTokens = readNumber(value, FIELD_ALIASES.outputTokens) ?? 0
  const cacheReadInputTokens = readNumber(value, FIELD_ALIASES.cacheReadInputTokens) ?? 0
  const cacheCreationInputTokens = readNumber(value, FIELD_ALIASES.cacheCreationInputTokens) ?? 0
  const reasoningOutputTokens = readNumber(value, FIELD_ALIASES.reasoningOutputTokens) ?? 0
  const explicitUnknownTokens = readNumber(value, FIELD_ALIASES.unknownTokens) ?? 0
  const directTotal = readNumber(value, TOTAL_ALIASES)

  const knownTotal =
    inputTokens +
    outputTokens +
    cacheReadInputTokens +
    cacheCreationInputTokens +
    reasoningOutputTokens
  const unknownTokens =
    directTotal == null
      ? explicitUnknownTokens
      : Math.max(explicitUnknownTokens, directTotal - knownTotal)
  const totalTokens = Math.max(directTotal ?? 0, knownTotal + unknownTokens)

  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    reasoningOutputTokens,
    unknownTokens,
    totalTokens,
    hasBreakdown: knownTotal > 0
  }
}

export function addTokenUsage(
  left: TokenUsageBreakdown,
  right: TokenUsageBreakdown
): TokenUsageBreakdown {
  return normalizeTokenUsage({
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cacheReadInputTokens: left.cacheReadInputTokens + right.cacheReadInputTokens,
    cacheCreationInputTokens: left.cacheCreationInputTokens + right.cacheCreationInputTokens,
    reasoningOutputTokens: left.reasoningOutputTokens + right.reasoningOutputTokens,
    unknownTokens: left.unknownTokens + right.unknownTokens
  })
}

export function tokenUsageTotal(value: unknown): number {
  return normalizeTokenUsage(value).totalTokens
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
