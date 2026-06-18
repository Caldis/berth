import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardInsights } from '../../src/renderer/src/hooks/use-dashboard-insights'

// GH-138: useDashboardInsights threads the global `agentView` filter into the
// insights:dashboard IPC. Contract: 'all'/undefined must leave the request shape
// identical to before (no `agentView` key — default behavior unchanged); a
// concrete agentId is forwarded and a change re-fires the request.

const EMPTY_INSIGHTS = {
  heatmap: { days: [], maxSessions: 0, maxTokens: 0, rangeStart: '', rangeEnd: '' },
  streak: { current: 0, longest: 0, lastActiveDate: null },
  peak: {
    cumulativeTokens: 0,
    peakDailyTokens: 0,
    peakSessionTokens: 0,
    maxSessionDurationSeconds: 0,
    totalSessions: 0
  },
  topSkills: [],
  topMcpServers: [],
  insights: {
    totalSessions: 0,
    skillsExplored: 0,
    pluginsInstalled: 0,
    mcpServersConfigured: 0,
    totalSkillInvocations: 0,
    topModel: null,
    agentSplit: []
  },
  rhythm: { grid: [], maxSessions: 0, totalSessions: 0, peak: null },
  durationHistogram: { buckets: [], total: 0, maxCount: 0 },
  modelEfficiency: { models: [], maxAvg: 0 },
  modelTrend: { days: [], models: [], points: [], maxTotal: 0, rangeStart: '', rangeEnd: '' }
}

describe('useDashboardInsights — agentView threading (GH-138)', () => {
  beforeEach(() => {
    window.api.insights.dashboard = vi.fn(async () => EMPTY_INSIGHTS)
  })

  it("omits agentView from the request for 'all' / undefined (default identity)", async () => {
    const { result, rerender } = renderHook(
      ({ agentView }: { agentView?: 'all' | string }) => useDashboardInsights(365, undefined, agentView),
      { initialProps: { agentView: undefined as 'all' | string | undefined } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(window.api.insights.dashboard).toHaveBeenLastCalledWith({ days: 365 })

    rerender({ agentView: 'all' })
    // 'all' is payload-identical to undefined: the request still carries NO
    // `agentView` key (default behavior unchanged), whatever the call count.
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(window.api.insights.dashboard).toHaveBeenLastCalledWith({ days: 365 })
  })

  it('forwards a concrete agentId and re-fires when the selection changes', async () => {
    const { result, rerender } = renderHook(
      ({ agentView }: { agentView?: 'all' | string }) => useDashboardInsights(365, undefined, agentView),
      { initialProps: { agentView: 'claude' as 'all' | string } }
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(window.api.insights.dashboard).toHaveBeenLastCalledWith({ days: 365, agentView: 'claude' })

    rerender({ agentView: 'codex' })
    await waitFor(() =>
      expect(window.api.insights.dashboard).toHaveBeenLastCalledWith({ days: 365, agentView: 'codex' })
    )
    expect(window.api.insights.dashboard).toHaveBeenCalledTimes(2)
  })
})
