import { describe, expect, it } from 'vitest'
import type { Asset, AssetStats } from '@shared/types/asset'
import {
  buildActivityHeatmap,
  buildActivityInsights,
  buildDashboardInsights,
  buildPeakMetrics,
  buildStreakStats,
  buildTopUsage
} from '@berth/scan-engine/engine/activity-insights'

const NOW = '2026-06-17T12:00:00.000Z' // today=2026-06-17, yesterday=2026-06-16

let counter = 0
function session(meta: Record<string, unknown>): Asset {
  counter += 1
  return {
    id: `sess-${counter}`,
    agentId: typeof meta.agentId === 'string' ? meta.agentId : 'claude-code',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: `session ${counter}`,
    path: `/tmp/sess-${counter}.jsonl`,
    meta
  }
}

function other(type: Asset['type']): Asset {
  counter += 1
  return {
    id: `asset-${counter}`,
    agentId: 'claude-code',
    category: 'instruction',
    type,
    scope: 'user',
    name: `asset ${counter}`,
    path: `/tmp/asset-${counter}`,
    meta: {}
  }
}

const stats: AssetStats = {
  skills: 93,
  mcpServers: 7,
  sessions: 0,
  plugins: 5,
  hooks: 2,
  commands: 4,
  subagents: 1
}

describe('buildActivityHeatmap', () => {
  it('materializes a continuous day range with zero-fill and per-day buckets', () => {
    const heatmap = buildActivityHeatmap(
      [
        session({ startedAt: '2026-06-17T01:00:00.000Z', totalTokens: 100 }),
        session({ startedAt: '2026-06-17T09:00:00.000Z', totalTokens: 200 }),
        session({ startedAt: '2026-06-15T09:00:00.000Z', totalTokens: 50 })
      ],
      { days: 7, now: NOW }
    )

    expect(heatmap.days).toHaveLength(7)
    expect(heatmap.rangeStart).toBe('2026-06-11')
    expect(heatmap.rangeEnd).toBe('2026-06-17')
    expect(heatmap.days[6]).toEqual({ date: '2026-06-17', sessions: 2, tokens: 300 })
    expect(heatmap.days[4]).toEqual({ date: '2026-06-15', sessions: 1, tokens: 50 })
    expect(heatmap.days[5]).toEqual({ date: '2026-06-16', sessions: 0, tokens: 0 })
    expect(heatmap.maxSessions).toBe(2)
    expect(heatmap.maxTokens).toBe(300)
  })

  it('excludes sessions outside the range', () => {
    const heatmap = buildActivityHeatmap(
      [
        session({ startedAt: '2025-01-01T00:00:00.000Z', totalTokens: 9999 }),
        session({ startedAt: '2026-06-17T00:00:00.000Z', totalTokens: 10 })
      ],
      { days: 7, now: NOW }
    )
    expect(heatmap.maxTokens).toBe(10)
    expect(heatmap.days.every((d) => d.date >= '2026-06-11')).toBe(true)
  })
})

describe('buildStreakStats', () => {
  it('counts current streak anchored to today across the latest consecutive run', () => {
    const streak = buildStreakStats(
      [
        session({ startedAt: '2026-06-17T01:00:00.000Z' }),
        session({ startedAt: '2026-06-16T01:00:00.000Z' }),
        session({ startedAt: '2026-06-15T01:00:00.000Z' }),
        session({ startedAt: '2026-06-01T01:00:00.000Z' }),
        session({ startedAt: '2026-06-02T01:00:00.000Z' })
      ],
      { now: NOW }
    )
    expect(streak).toEqual({ current: 3, longest: 3, lastActiveDate: '2026-06-17' })
  })

  it('returns current=0 when last active day is neither today nor yesterday', () => {
    const streak = buildStreakStats([session({ startedAt: '2026-06-10T01:00:00.000Z' })], { now: NOW })
    expect(streak).toEqual({ current: 0, longest: 1, lastActiveDate: '2026-06-10' })
  })

  it('anchors current streak to yesterday', () => {
    const streak = buildStreakStats(
      [
        session({ startedAt: '2026-06-16T01:00:00.000Z' }),
        session({ startedAt: '2026-06-15T01:00:00.000Z' })
      ],
      { now: NOW }
    )
    expect(streak.current).toBe(2)
    expect(streak.lastActiveDate).toBe('2026-06-16')
  })

  it('handles no sessions', () => {
    expect(buildStreakStats([], { now: NOW })).toEqual({ current: 0, longest: 0, lastActiveDate: null })
  })
})

describe('buildPeakMetrics', () => {
  it('aggregates cumulative/peak token and duration metrics', () => {
    const peak = buildPeakMetrics([
      session({ startedAt: '2026-06-17T01:00:00.000Z', totalTokens: 100, duration: 60 }),
      session({ startedAt: '2026-06-17T05:00:00.000Z', totalTokens: 200, duration: 300 }),
      session({ startedAt: '2026-06-15T05:00:00.000Z', totalTokens: 50 })
    ])
    expect(peak).toEqual({
      cumulativeTokens: 350,
      peakDailyTokens: 300,
      peakSessionTokens: 200,
      maxSessionDurationSeconds: 300,
      totalSessions: 3
    })
  })
})

describe('buildTopUsage', () => {
  const sessions = [
    session({ skillsUsed: ['alpha', 'beta'], mcpServers: ['m1'] }),
    session({ skillsUsed: ['alpha'] }),
    session({ skillsUsed: ['alpha', 'gamma'] })
  ]

  it('counts, sorts by count desc then name asc, computes pct', () => {
    const top = buildTopUsage(sessions, { kind: 'skill' })
    expect(top).toEqual([
      { name: 'alpha', count: 3, pct: 60 },
      { name: 'beta', count: 1, pct: 20 },
      { name: 'gamma', count: 1, pct: 20 }
    ])
  })

  it('respects limit', () => {
    expect(buildTopUsage(sessions, { kind: 'skill', limit: 2 })).toEqual([
      { name: 'alpha', count: 3, pct: 60 },
      { name: 'beta', count: 1, pct: 20 }
    ])
  })

  it('aggregates mcp servers', () => {
    expect(buildTopUsage(sessions, { kind: 'mcp' })).toEqual([{ name: 'm1', count: 1, pct: 100 }])
  })
})

describe('buildActivityInsights', () => {
  it('derives counts, top model and agent split from sessions + stats', () => {
    const insights = buildActivityInsights(
      [
        session({ skillsUsed: ['a', 'b'], model: 'claude-opus-4-8', agentId: 'claude-code' }),
        session({ skillsUsed: ['a'], model: 'claude-opus-4-8', agentId: 'claude-code' }),
        session({ skillsUsed: [], model: 'gpt-5.5', agentId: 'codex' })
      ],
      stats
    )
    expect(insights.totalSessions).toBe(3)
    expect(insights.skillsExplored).toBe(93)
    expect(insights.pluginsInstalled).toBe(5)
    expect(insights.mcpServersConfigured).toBe(7)
    expect(insights.totalSkillInvocations).toBe(3)
    expect(insights.topModel).toBe('claude-opus-4-8')
    expect(insights.agentSplit).toEqual([
      { agentId: 'claude-code', count: 2 },
      { agentId: 'codex', count: 1 }
    ])
  })
})

describe('buildDashboardInsights', () => {
  it('orchestrates all aggregates and ignores non-session assets', () => {
    const result = buildDashboardInsights(
      [
        session({ startedAt: '2026-06-17T01:00:00.000Z', totalTokens: 100, skillsUsed: ['a'] }),
        other('skill'),
        other('plugin')
      ],
      stats,
      { days: 30, now: NOW }
    )
    expect(result.peak.totalSessions).toBe(1)
    expect(result.insights.totalSessions).toBe(1)
    expect(result.heatmap.days).toHaveLength(30)
    expect(result.topSkills).toEqual([{ name: 'a', count: 1, pct: 100 }])
  })
})
