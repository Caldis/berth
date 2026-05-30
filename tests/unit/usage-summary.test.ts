import { describe, expect, it } from 'vitest'
import { buildUsageSummary } from '../../src/main/engine/usage'
import type { Asset } from '../../src/shared/types/asset'

describe('buildUsageSummary', () => {
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
    expect(summary.totalCost).toBe(0)
    expect(summary.byModel).toEqual([
      { model: 'claude-opus', percentage: 95, cost: 0 },
      { model: 'claude-sonnet', percentage: 5, cost: 0 }
    ])
    expect(summary.dailyCosts).toEqual([])
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
    expect(summary.totalCost).toBe(1.25)
    expect(summary.byModel).toEqual([{ model: 'claude-opus', percentage: 100, cost: 1.25 }])
    expect(summary.byProject).toEqual([{ project: 'D--Code-berth', percentage: 100, cost: 1.25 }])
    expect(summary.dailyCosts).toEqual([{ date: '2026-05-30', cost: 1.25 }])
  })
})
