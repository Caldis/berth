import type { Asset, SessionSummary } from '@shared/types/asset'
import type { SessionActivityMetrics } from '@shared/types/ipc'
import { normalizeTokenUsage } from '@shared/token-usage'

export const MIN_TOKEN_RATE_DURATION_SECONDS = 60
export const TOKEN_RATE_IDLE_GAP_SECONDS = 30 * 60

type TokenRateSampleKind = 'incremental' | 'cumulative'

interface TokenRateSample {
  timestamp: string
  timeMs: number
  tokens: number
  kind: TokenRateSampleKind
}

export function toSessionActivityMetrics(
  _summary: Pick<SessionSummary, 'tokenUsage'>,
  asset: Pick<Asset, 'agentId' | 'meta' | 'raw'>
): SessionActivityMetrics {
  const window = selectLatestActivityWindow(extractTokenRateSamples(asset))
  if (!window) return unavailableMetrics(null)

  const durationSeconds = calculateDurationSeconds(window[0].timestamp, window[window.length - 1].timestamp)
  const tokenCount = calculateWindowTokenCount(window)

  if (
    window.length >= 2 &&
    durationSeconds != null &&
    durationSeconds >= MIN_TOKEN_RATE_DURATION_SECONDS &&
    tokenCount != null &&
    tokenCount > 0
  ) {
    return {
      tokenRatePerMinute: tokenCount / (durationSeconds / 60),
      tokenRateDurationSeconds: durationSeconds,
      tokenRateSource: 'activity-window',
      tokenRateStartedAt: window[0].timestamp,
      tokenRateEndedAt: window[window.length - 1].timestamp,
      tokenRateTokenCount: tokenCount,
      tokenRateSampleCount: window.length,
      tokenRateIdleGapSeconds: TOKEN_RATE_IDLE_GAP_SECONDS
    }
  }

  return unavailableMetrics(window)
}

function unavailableMetrics(window: TokenRateSample[] | null): SessionActivityMetrics {
  const startedAt = window?.[0]?.timestamp ?? null
  const endedAt = window?.[window.length - 1]?.timestamp ?? null
  const durationSeconds = window ? calculateDurationSeconds(startedAt, endedAt) : null
  const tokenCount = window ? calculateWindowTokenCount(window) : null

  return {
    tokenRatePerMinute: null,
    tokenRateDurationSeconds: durationSeconds,
    tokenRateSource: 'unavailable',
    tokenRateStartedAt: startedAt,
    tokenRateEndedAt: endedAt,
    tokenRateTokenCount: tokenCount,
    tokenRateSampleCount: window?.length ?? 0,
    tokenRateIdleGapSeconds: TOKEN_RATE_IDLE_GAP_SECONDS
  }
}

function extractTokenRateSamples(asset: Pick<Asset, 'agentId' | 'raw'>): TokenRateSample[] {
  if (!asset.raw) return []

  const samples: TokenRateSample[] = []
  for (const record of readJsonLines(asset.raw)) {
    const timestamp = readValidTimestamp(record)
    if (!timestamp) continue

    const sample =
      asset.agentId === 'codex'
        ? readCodexTokenRateSample(record, timestamp)
        : readClaudeTokenRateSample(record, timestamp)
    if (sample) samples.push(sample)
  }

  return samples.sort((left, right) => left.timeMs - right.timeMs)
}

function selectLatestActivityWindow(samples: TokenRateSample[]): TokenRateSample[] | null {
  const positiveSamples = samples.filter((sample) => sample.tokens > 0)
  if (positiveSamples.length === 0) return null

  let latestWindow: TokenRateSample[] = []
  for (const sample of positiveSamples) {
    const previous = latestWindow[latestWindow.length - 1]
    if (previous && sample.timeMs - previous.timeMs > TOKEN_RATE_IDLE_GAP_SECONDS * 1000) {
      latestWindow = [sample]
    } else {
      latestWindow.push(sample)
    }
  }

  return latestWindow.length > 0 ? latestWindow : null
}

function calculateWindowTokenCount(window: TokenRateSample[]): number | null {
  if (window.length === 0) return null
  if (window.every((sample) => sample.kind === 'cumulative')) {
    if (window.length < 2) return null
    const delta = window[window.length - 1].tokens - window[0].tokens
    return delta > 0 ? delta : null
  }
  if (window.every((sample) => sample.kind === 'incremental')) {
    const total = window.reduce((sum, sample) => sum + sample.tokens, 0)
    return total > 0 ? total : null
  }

  let total = 0
  for (let index = 0; index < window.length; index += 1) {
    const sample = window[index]
    if (sample.kind === 'incremental') {
      total += sample.tokens
      continue
    }
    const previous = window[index - 1]
    if (previous?.kind === 'cumulative') {
      total += Math.max(0, sample.tokens - previous.tokens)
    }
  }
  return total > 0 ? total : null
}

function readClaudeTokenRateSample(record: Record<string, unknown>, timestamp: string): TokenRateSample | null {
  const message = isRecord(record.message) ? record.message : undefined
  const usage = isRecord(message?.usage) ? message.usage : undefined
  if (!usage) return null
  return toTokenRateSample(timestamp, tokenTotal(usage), 'incremental')
}

function readCodexTokenRateSample(record: Record<string, unknown>, timestamp: string): TokenRateSample | null {
  const payload = isRecord(record.payload) ? record.payload : record
  if (readString(record, 'type') !== 'event_msg' || readString(payload, 'type') !== 'token_count') return null

  const info = isRecord(payload.info) ? payload.info : undefined
  const lastUsage = readRecord(payload, 'last_token_usage') ?? readRecord(info, 'last_token_usage')
  const lastUsageTotal = tokenTotal(lastUsage)
  if (lastUsageTotal > 0) return toTokenRateSample(timestamp, lastUsageTotal, 'incremental')

  const totalUsage = readRecord(payload, 'total_token_usage') ?? readRecord(info, 'total_token_usage')
  const cumulativeTotal = tokenTotal(totalUsage) || tokenTotal(info) || tokenTotal(payload)
  return toTokenRateSample(timestamp, cumulativeTotal, 'cumulative')
}

function toTokenRateSample(
  timestamp: string,
  tokens: number,
  kind: TokenRateSampleKind
): TokenRateSample | null {
  const timeMs = new Date(timestamp).getTime()
  if (Number.isNaN(timeMs) || tokens <= 0) return null
  return { timestamp, timeMs, tokens, kind }
}

function tokenTotal(record: Record<string, unknown> | undefined): number {
  if (!record) return 0
  return normalizeTokenUsage({ ...readNestedTokenRecord(record), ...record }).totalTokens
}

function readJsonLines(raw: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (isRecord(parsed)) records.push(parsed)
    } catch {
      // Session files can contain partially written trailing lines while an agent is active.
    }
  }
  return records
}

function readValidTimestamp(record: Record<string, unknown>): string | null {
  const timestamp = readString(record, 'timestamp')
  if (!timestamp) return null
  const timeMs = new Date(timestamp).getTime()
  return Number.isNaN(timeMs) ? null : timestamp
}

function readRecord(record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  if (!record) return undefined
  const value = record[key]
  return isRecord(value) ? value : undefined
}

function readNestedTokenRecord(record: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {}
  const tokenKeys = [
    'input_tokens',
    'output_tokens',
    'cached_input_tokens',
    'cache_read_input_tokens',
    'cache_creation_input_tokens',
    'reasoning_output_tokens',
    'unknown_tokens',
    'total_tokens'
  ]
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'number' && tokenKeys.includes(key) && Number.isFinite(value)) {
      result[key] = (result[key] ?? 0) + value
    } else if (isRecord(value)) {
      const nested = readNestedTokenRecord(value)
      for (const [nestedKey, nestedValue] of Object.entries(nested)) {
        result[nestedKey] = (result[nestedKey] ?? 0) + nestedValue
      }
    }
  }
  return result
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function calculateDurationSeconds(
  startedAt: string | null,
  endedAt: string | null
): number | null {
  if (!startedAt || !endedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return Math.max(0, Math.round((end - start) / 1000))
}
