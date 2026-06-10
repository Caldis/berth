import { describe, expect, it } from 'vitest'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage,
  TOKEN_BREAKDOWN_ALIAS_KEYS,
  tokenUsageCacheDetails,
  tokenUsageSegments,
  tokenUsageTotal
} from '../../src/shared/token-usage'

describe('token usage helpers', () => {
  it('returns a stable empty breakdown', () => {
    expect(emptyTokenUsage()).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      reasoningOutputTokens: 0,
      unknownTokens: 0,
      totalTokens: 0,
      hasBreakdown: false
    })
  })

  it('exposes breakdown alias keys for nested collectors, excluding totals', () => {
    for (const key of [
      'input_tokens',
      'inputTokens',
      'output_tokens',
      'cached_input_tokens',
      'cache_read_input_tokens',
      'cache_creation_input_tokens',
      'reasoning_output_tokens'
    ]) {
      expect(TOKEN_BREAKDOWN_ALIAS_KEYS).toContain(key)
    }
    for (const totalKey of ['totalTokens', 'total_tokens', 'tokens']) {
      expect(TOKEN_BREAKDOWN_ALIAS_KEYS).not.toContain(totalKey)
    }
  })

  it('normalizes snake_case and camelCase token fields', () => {
    expect(
      normalizeTokenUsage({
        input_tokens: 10,
        outputTokens: 5,
        cache_read_input_tokens: 20,
        cacheCreationInputTokens: 3,
        reasoning_output_tokens: 2
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cacheReadInputTokens: 20,
      cacheCreationInputTokens: 3,
      reasoningOutputTokens: 2,
      unknownTokens: 0,
      totalTokens: 40,
      hasBreakdown: true
    })
  })

  it('keeps total-only values as unknown tokens', () => {
    expect(normalizeTokenUsage({ total_tokens: 42 })).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      reasoningOutputTokens: 0,
      unknownTokens: 42,
      totalTokens: 42,
      hasBreakdown: false
    })
  })

  it('adds breakdowns without losing unknown tokens', () => {
    const total = addTokenUsage(
      normalizeTokenUsage({ inputTokens: 10, outputTokens: 5 }),
      normalizeTokenUsage({ tokens: 12 })
    )

    expect(total).toMatchObject({
      inputTokens: 10,
      outputTokens: 5,
      unknownTokens: 12,
      totalTokens: 27,
      hasBreakdown: true
    })
    expect(tokenUsageTotal(total)).toBe(27)
  })

  it('derives display segments from the token breakdown', () => {
    const segments = tokenUsageSegments(
      normalizeTokenUsage({
        inputTokens: 10,
        outputTokens: 5,
        cacheReadInputTokens: 20,
        cacheCreationInputTokens: 3,
        reasoningOutputTokens: 2
      })
    )

    expect(segments).toEqual([
      { id: 'input', tokens: 10, percentage: 25 },
      { id: 'output', tokens: 5, percentage: 12.5 },
      { id: 'cache', tokens: 23, percentage: 57.5 },
      { id: 'reasoning', tokens: 2, percentage: 5 }
    ])
  })

  it('keeps cache read and write counts available for display', () => {
    const details = tokenUsageCacheDetails(
      normalizeTokenUsage({
        cacheReadInputTokens: 20,
        cacheCreationInputTokens: 3
      })
    )

    expect(details).toEqual({
      readTokens: 20,
      writeTokens: 3,
      totalTokens: 23,
      hasDetails: true
    })
  })

  it('uses unknown as the only segment when only total tokens are known', () => {
    expect(tokenUsageSegments(normalizeTokenUsage({ totalTokens: 42 }))).toEqual([
      { id: 'unknown', tokens: 42, percentage: 100 }
    ])
  })
})
