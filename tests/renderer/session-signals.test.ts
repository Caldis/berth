import { describe, it, expect } from 'vitest'
import {
  buildSessionSignals,
  countSignalHighlights,
  getToolDurationMs,
  type SessionSignals
} from '../../src/renderer/src/lib/session-signals'
import type { SessionDetailResult, SessionToolEvent } from '@shared/types/ipc'

// GH-144: direct tests for the session-signal aggregator extracted out of the
// session-detail god-page (previously only covered indirectly via rendering).

function toolEvent(over: Partial<SessionToolEvent> = {}): SessionToolEvent {
  return {
    name: 'Bash',
    status: 'success',
    durationMs: 100,
    startedAt: null,
    endedAt: null,
    ...over
  } as SessionToolEvent
}

function detailWith(over: {
  toolTimeline?: SessionToolEvent[]
  duration?: number | null
  cost?: number | null
  tokenUsage?: Partial<{ inputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number }>
} = {}): SessionDetailResult {
  return {
    toolTimeline: over.toolTimeline ?? [],
    summary: {
      duration: over.duration === undefined ? 600 : over.duration,
      cost: over.cost === undefined ? null : over.cost,
      tokenUsage: {
        inputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        ...over.tokenUsage
      }
    },
    activityMetrics: {
      tokenRatePerMinute: 12,
      tokenRateDurationSeconds: 60,
      tokenRateSource: null,
      tokenRateStartedAt: null,
      tokenRateEndedAt: null,
      tokenRateTokenCount: null,
      tokenRateSampleCount: 0,
      tokenRateIdleGapSeconds: 0
    }
  } as unknown as SessionDetailResult
}

describe('getToolDurationMs', () => {
  it('prefers explicit non-negative durationMs', () => {
    expect(getToolDurationMs(toolEvent({ durationMs: 250 }))).toBe(250)
  })
  it('derives from startedAt/endedAt when durationMs absent', () => {
    const e = toolEvent({ durationMs: undefined, startedAt: '2026-06-13T10:00:00.000Z', endedAt: '2026-06-13T10:00:02.000Z' })
    expect(getToolDurationMs(e)).toBe(2000)
  })
  it('returns null when neither durationMs nor valid timestamps', () => {
    expect(getToolDurationMs(toolEvent({ durationMs: undefined, startedAt: null, endedAt: null }))).toBeNull()
    expect(getToolDurationMs(toolEvent({ durationMs: -5, startedAt: null, endedAt: null }))).toBeNull()
  })
})

describe('buildSessionSignals', () => {
  it('returns null/zero fields for an empty tool timeline', () => {
    const s = buildSessionSignals(detailWith({ toolTimeline: [] }))
    expect(s.toolCount).toBe(0)
    expect(s.failedCount).toBe(0)
    expect(s.failedRate).toBeNull()
    expect(s.avgToolDurationMs).toBeNull()
    expect(s.slowestTool).toBeNull()
  })

  it('counts failures and computes failedRate', () => {
    const s = buildSessionSignals(detailWith({
      toolTimeline: [toolEvent({ status: 'success' }), toolEvent({ status: 'error' }), toolEvent({ status: 'error' })]
    }))
    expect(s.toolCount).toBe(3)
    expect(s.failedCount).toBe(2)
    expect(s.failedRate).toBeCloseTo((2 / 3) * 100)
  })

  it('computes avgToolDurationMs and slowestTool', () => {
    const s = buildSessionSignals(detailWith({
      toolTimeline: [toolEvent({ name: 'A', durationMs: 100 }), toolEvent({ name: 'B', durationMs: 300 })]
    }))
    expect(s.avgToolDurationMs).toBe(200)
    expect(s.slowestTool).toEqual({ name: 'B', durationMs: 300 })
  })

  it('computes cacheReadShare from input-side tokens', () => {
    const s = buildSessionSignals(detailWith({
      tokenUsage: { inputTokens: 30, cacheReadInputTokens: 60, cacheCreationInputTokens: 10 }
    }))
    // 60 / (30+60+10) = 60%
    expect(s.cacheReadShare).toBeCloseTo(60)
  })

  it('cacheReadShare null when no input-side tokens', () => {
    const s = buildSessionSignals(detailWith({ tokenUsage: { inputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } }))
    expect(s.cacheReadShare).toBeNull()
  })

  it('computes costRatePerMinute from cost and duration', () => {
    const s = buildSessionSignals(detailWith({ cost: 6, duration: 600 })) // 600s = 10min → 0.6/min
    expect(s.costRatePerMinute).toBeCloseTo(0.6)
  })

  it('costRatePerMinute null when cost or duration missing', () => {
    expect(buildSessionSignals(detailWith({ cost: null, duration: 600 })).costRatePerMinute).toBeNull()
    expect(buildSessionSignals(detailWith({ cost: 5, duration: null })).costRatePerMinute).toBeNull()
  })
})

describe('countSignalHighlights', () => {
  const base: SessionSignals = {
    toolCount: 0, failedCount: 0, failedRate: null, avgToolDurationMs: null, slowestTool: null,
    tokenRatePerMinute: null, tokenRateDurationSeconds: null, tokenRateSource: null,
    tokenRateStartedAt: null, tokenRateEndedAt: null, tokenRateTokenCount: null,
    tokenRateSampleCount: 0, tokenRateIdleGapSeconds: 0, cacheReadShare: null, costRatePerMinute: null
  }
  it('returns 0 for null signals', () => {
    expect(countSignalHighlights(null)).toBe(0)
  })
  it('counts failed + slowestTool + cacheReadShare>50', () => {
    expect(countSignalHighlights({ ...base, failedCount: 1, slowestTool: { name: 'A', durationMs: 9 }, cacheReadShare: 60 })).toBe(3)
  })
  it('does not count cacheReadShare at or below 50', () => {
    expect(countSignalHighlights({ ...base, cacheReadShare: 50 })).toBe(0)
  })
})
