import { describe, expect, it } from 'vitest'
import { buildUsageSummary } from '../../src/main/engine/usage'
import type { ModelPricing } from '../../src/main/engine/pricing'
import type { Asset } from '../../src/shared/types/asset'

describe('buildUsageSummary', () => {
  const localPricing: ModelPricing = {
    model: 'priced-model',
    provider: 'test',
    inputCostPerToken: 0.01,
    outputCostPerToken: 0.02,
    cacheReadInputCostPerToken: 0.001,
    cacheCreationInputCostPerToken: 0.005,
    source: 'local'
  }

  it('uses stats-cache token and model data when usage-data is absent', () => {
    const statsCache: Asset = {
      id: 'stats-cache',
      agentId: 'claude-code',
      category: 'observability',
      type: 'stats-cache',
      scope: 'user',
      name: 'stats-cache',
      path: 'C:\\Users\\test\\.claude\\stats-cache.json',
      meta: {
        modelUsage: {
          'claude-opus': {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadInputTokens: 850,
            costUSD: 0
          },
          'claude-sonnet': {
            inputTokens: 25,
            outputTokens: 25,
            costUSD: 0
          }
        }
      }
    }

    const summary = buildUsageSummary([statsCache])

    expect(summary.totalTokens).toBe(1050)
    expect(summary.tokenUsage).toMatchObject({
      inputTokens: 125,
      outputTokens: 75,
      cacheReadInputTokens: 850,
      totalTokens: 1050
    })
    expect(summary.totalCost).toBe(0)
    expect(summary.byModel).toMatchObject([
      { model: 'claude-opus', percentage: 95, cost: 0, tokens: 1000 },
      { model: 'claude-sonnet', percentage: 5, cost: 0, tokens: 50 }
    ])
    expect(summary.dailyCosts).toEqual([])
  })

  it('keeps stats-cache daily model token dates separate from model totals', () => {
    const statsCache: Asset = {
      id: 'stats-cache',
      agentId: 'claude-code',
      category: 'observability',
      type: 'stats-cache',
      scope: 'user',
      name: 'stats-cache',
      path: 'C:\\Users\\test\\.claude\\stats-cache.json',
      meta: {
        dailyModelTokens: [
          { date: '2026-05-29', tokensByModel: { 'claude-opus': 100 } },
          { date: '2026-05-30', tokensByModel: { 'claude-opus': 50, 'claude-sonnet': 25 } }
        ]
      }
    }

    const summary = buildUsageSummary([statsCache])

    expect(summary.totalTokens).toBe(175)
    expect(summary.byModel).toMatchObject([
      { model: 'claude-opus', tokens: 150, percentage: 86 },
      { model: 'claude-sonnet', tokens: 25, percentage: 14 }
    ])
    expect(summary.dailyTokenUsage).toMatchObject([
      { date: '2026-05-29', tokenUsage: { totalTokens: 100 } },
      { date: '2026-05-30', tokenUsage: { totalTokens: 75 } }
    ])
  })

  it('prefers usage-data assets over stats-cache', () => {
    const usageData: Asset = {
      id: 'usage-data',
      agentId: 'claude-code',
      category: 'observability',
      type: 'usage-data',
      scope: 'user',
      name: '2026-05-30',
      path: 'C:\\Users\\test\\.claude\\usage-data\\2026-05-30.json',
      meta: {
        date: '2026-05-30',
        model: 'claude-opus',
        project: 'D--Code-berth',
        costUSD: 1.25,
        totalTokens: 500
      }
    }
    const statsCache: Asset = {
      id: 'stats-cache',
      agentId: 'claude-code',
      category: 'observability',
      type: 'stats-cache',
      scope: 'user',
      name: 'stats-cache',
      path: 'C:\\Users\\test\\.claude\\stats-cache.json',
      meta: {
        modelUsage: {
          ignored: { inputTokens: 9999 }
        }
      }
    }

    const summary = buildUsageSummary([statsCache, usageData])

    expect(summary.totalTokens).toBe(500)
    expect(summary.tokenUsage).toMatchObject({ unknownTokens: 500, totalTokens: 500 })
    expect(summary.totalCost).toBe(1.25)
    expect(summary.costSource).toBe('actual')
    expect(summary.byModel).toMatchObject([{ model: 'claude-opus', percentage: 100, cost: 1.25, tokens: 500 }])
    expect(summary.byProject).toMatchObject([{ project: 'D--Code-berth', percentage: 100, cost: 1.25, tokens: 500 }])
    expect(summary.dailyCosts).toEqual([{ date: '2026-05-30', cost: 1.25 }])
  })

  it('merges each agent best source instead of dropping session-only agents', () => {
    const claudeUsage: Asset = {
      id: 'claude-usage-data',
      agentId: 'claude-code',
      category: 'observability',
      type: 'usage-data',
      scope: 'user',
      name: '2026-05-30',
      path: 'C:\\Users\\test\\.claude\\usage-data\\2026-05-30.json',
      meta: {
        date: '2026-05-30',
        model: 'claude-opus',
        project: 'berth',
        costUSD: 1,
        inputTokens: 80,
        outputTokens: 20
      }
    }
    const codexSession: Asset = {
      id: 'codex-session-abc',
      agentId: 'codex',
      category: 'state',
      type: 'session',
      scope: 'session',
      name: 'Codex Session',
      path: 'C:\\Users\\test\\.codex\\sessions\\rollout.jsonl',
      meta: {
        startedAt: '2026-05-30T01:00:00.000Z',
        project: 'berth',
        model: 'gpt-5.3-codex',
        tokenUsage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 }
      }
    }

    const summary = buildUsageSummary([claudeUsage, codexSession])

    expect(summary.totalTokens).toBe(130)
    expect(summary.byModel).toMatchObject([
      { model: 'claude-opus', tokens: 100, percentage: 77 },
      { model: 'gpt-5.3-codex', tokens: 30, percentage: 23 }
    ])
    expect(summary.byProject).toMatchObject([{ project: 'berth', tokens: 130, percentage: 100 }])
    expect(summary.dailyTokenUsage).toMatchObject([
      { date: '2026-05-30', tokenUsage: { totalTokens: 130 } }
    ])
  })

  it('uses token percentages for model and project token breakdowns even when costs differ', () => {
    const expensiveSmall: Asset = {
      id: 'expensive-small',
      agentId: 'claude-code',
      category: 'observability',
      type: 'usage-data',
      scope: 'user',
      name: 'expensive',
      path: 'C:\\Users\\test\\.claude\\usage-data\\2026-05-30.json',
      meta: {
        date: '2026-05-30',
        model: 'expensive',
        project: 'small',
        costUSD: 90,
        totalTokens: 10
      }
    }
    const cheapLarge: Asset = {
      ...expensiveSmall,
      id: 'cheap-large',
      name: 'cheap',
      meta: {
        date: '2026-05-30',
        model: 'cheap',
        project: 'large',
        costUSD: 10,
        totalTokens: 90
      }
    }

    const summary = buildUsageSummary([expensiveSmall, cheapLarge])

    expect(summary.totalCost).toBe(100)
    expect(summary.byModel).toMatchObject([
      { model: 'expensive', tokens: 10, percentage: 10 },
      { model: 'cheap', tokens: 90, percentage: 90 }
    ])
    expect(summary.byProject).toMatchObject([
      { project: 'small', tokens: 10, percentage: 10 },
      { project: 'large', tokens: 90, percentage: 90 }
    ])
  })

  it('estimates usage-data cost from pricing catalog when actual cost is absent', () => {
    const usageData: Asset = {
      id: 'usage-data-estimated',
      agentId: 'codex',
      category: 'observability',
      type: 'usage-data',
      scope: 'user',
      name: '2026-05-30',
      path: 'C:\\Users\\test\\.codex\\usage-data\\2026-05-30.json',
      meta: {
        date: '2026-05-30',
        model: 'test/priced-model',
        project: 'D--Code-berth',
        inputTokens: 10,
        outputTokens: 2,
        cacheReadInputTokens: 3,
        cacheCreationInputTokens: 4,
        reasoningOutputTokens: 5
      }
    }

    const summary = buildUsageSummary([usageData], { pricingCatalog: [localPricing] })

    expect(summary.totalCost).toBeCloseTo(0.263, 6)
    expect(summary.costSource).toBe('estimated')
    expect(summary.dailyCosts[0].cost).toBeCloseTo(0.263, 6)
    expect(summary.byModel).toMatchObject([{ model: 'test/priced-model', cost: 0.263, tokens: 24 }])
    expect(summary.byProject).toMatchObject([{ project: 'D--Code-berth', cost: 0.263, tokens: 24 }])
  })

  it('filters usage-data daily cost and token totals by day range', () => {
    const recentUsage: Asset = {
      id: 'usage-data-recent',
      agentId: 'claude-code',
      category: 'observability',
      type: 'usage-data',
      scope: 'user',
      name: '2026-05-30',
      path: 'C:\\Users\\test\\.claude\\usage-data\\2026-05-30.json',
      meta: {
        date: '2026-05-30',
        model: 'claude-opus',
        project: 'D--Code-berth',
        costUSD: 1.25,
        inputTokens: 100,
        outputTokens: 50
      }
    }
    const oldUsage: Asset = {
      ...recentUsage,
      id: 'usage-data-old',
      name: '2026-05-01',
      path: 'C:\\Users\\test\\.claude\\usage-data\\2026-05-01.json',
      meta: {
        ...recentUsage.meta,
        date: '2026-05-01',
        costUSD: 9,
        inputTokens: 900,
        outputTokens: 100
      }
    }

    const summary = buildUsageSummary([oldUsage, recentUsage], {
      days: 7,
      now: '2026-05-30T12:00:00.000Z'
    })

    expect(summary.totalCost).toBe(1.25)
    expect(summary.totalTokens).toBe(150)
    expect(summary.dailyCosts).toEqual([{ date: '2026-05-30', cost: 1.25 }])
    expect(summary.dailyTokenUsage).toHaveLength(1)
    expect(summary.dailyTokenUsage[0]).toMatchObject({
      date: '2026-05-30',
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 }
    })
  })

  it('falls back to session assets when usage-data and stats-cache are absent', () => {
    const session: Asset = {
      id: 'codex-session-abc',
      agentId: 'codex',
      category: 'state',
      type: 'session',
      scope: 'session',
      name: 'Codex Session',
      path: 'C:\\Users\\test\\.codex\\sessions\\rollout.jsonl',
      meta: {
        startedAt: '2026-05-30T01:00:00.000Z',
        project: 'berth',
        model: 'gpt-5.3-codex',
        tokenUsage: {
          inputTokens: 20,
          outputTokens: 10,
          cacheReadInputTokens: 5,
          cacheCreationInputTokens: 0,
          reasoningOutputTokens: 2,
          unknownTokens: 0,
          totalTokens: 37,
          hasBreakdown: true
        }
      }
    }

    const summary = buildUsageSummary([session], {
      days: 7,
      now: '2026-05-30T12:00:00.000Z'
    })

    expect(summary.totalTokens).toBe(37)
    expect(summary.byModel).toMatchObject([{ model: 'gpt-5.3-codex', tokens: 37 }])
    expect(summary.byProject).toMatchObject([{ project: 'berth', tokens: 37 }])
    expect(summary.dailyTokenUsage).toHaveLength(1)
    expect(summary.dailyTokenUsage[0]).toMatchObject({ date: '2026-05-30' })
  })
})
