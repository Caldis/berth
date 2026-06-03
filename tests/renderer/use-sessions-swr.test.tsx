import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSessionsCacheForTests, useSessions } from '../../src/renderer/src/hooks/use-ipc'
import type { SessionSummary } from '../../src/shared/types/asset'
import { normalizeTokenUsage } from '../../src/shared/token-usage'

function sessionSummary(id: string, title: string): SessionSummary {
  return {
    id,
    agentId: 'claude-code',
    title,
    project: 'berth',
    projectPath: 'D:/Code/berth',
    transcriptPath: `D:/Code/berth/${id}.jsonl`,
    startedAt: '2026-06-03T00:00:00.000Z',
    endedAt: '2026-06-03T00:01:00.000Z',
    duration: 60,
    cost: null,
    tokens: 12,
    tokenUsage: normalizeTokenUsage({ totalTokens: 12 }),
    model: 'claude-sonnet-4'
  }
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('useSessions stale refresh', () => {
  beforeEach(() => {
    resetSessionsCacheForTests()
  })

  it('keeps cached sessions visible while refreshing the same query', async () => {
    const cachedSession = sessionSummary('cached-session', 'Cached session')
    const refreshedSession = sessionSummary('refreshed-session', 'Refreshed session')
    const refresh = deferred<{ sessions: SessionSummary[]; totalCount: number }>()
    window.api.sessions.list = vi
      .fn()
      .mockResolvedValueOnce({ sessions: [cachedSession], totalCount: 1 })
      .mockReturnValueOnce(refresh.promise)

    const first = renderHook(() => useSessions({ agentView: 'all' }))

    await waitFor(() => {
      expect(first.result.current.sessions).toEqual([cachedSession])
      expect(first.result.current.loading).toBe(false)
      expect(first.result.current.stale).toBe(false)
    })
    first.unmount()

    const second = renderHook(() => useSessions({ agentView: 'all' }))

    expect(second.result.current.sessions).toEqual([cachedSession])
    await waitFor(() => {
      expect(second.result.current.loading).toBe(true)
      expect(second.result.current.stale).toBe(true)
    })

    await act(async () => {
      refresh.resolve({ sessions: [refreshedSession], totalCount: 1 })
      await refresh.promise
    })

    await waitFor(() => {
      expect(second.result.current.sessions).toEqual([refreshedSession])
      expect(second.result.current.loading).toBe(false)
      expect(second.result.current.stale).toBe(false)
    })
    expect(window.api.sessions.list).toHaveBeenCalledTimes(2)
  })

  it('does not reuse cached sessions for a different query', async () => {
    const globalSession = sessionSummary('global-session', 'Global session')
    window.api.sessions.list = vi
      .fn()
      .mockResolvedValueOnce({ sessions: [globalSession], totalCount: 1 })
      .mockResolvedValueOnce({ sessions: [], totalCount: 0 })

    const first = renderHook(() => useSessions({ agentView: 'all' }))

    await waitFor(() => {
      expect(first.result.current.sessions).toEqual([globalSession])
    })
    first.unmount()

    const scoped = renderHook(() => useSessions({ agentView: 'all', projectPath: 'D:/Code/berth' }))

    expect(scoped.result.current.sessions).toEqual([])
    expect(scoped.result.current.loading).toBe(true)
    expect(scoped.result.current.stale).toBe(false)

    await waitFor(() => {
      expect(scoped.result.current.loading).toBe(false)
    })
  })
})
