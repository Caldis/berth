import { describe, expect, it } from 'vitest'
import {
  addTokenUsage,
  emptyTokenUsage,
  normalizeTokenUsage,
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
})
