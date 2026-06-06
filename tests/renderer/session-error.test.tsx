import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useSessionDetail,
  useSessions,
  resetSessionsCacheForTests
} from '../../src/renderer/src/hooks/use-ipc'

describe('session hooks — error channel (GH-110 P4.3)', () => {
  beforeEach(() => {
    resetSessionsCacheForTests()
  })

  it('useSessions surfaces an error when the list IPC rejects, and reload recovers', async () => {
    window.api.sessions.list = vi
      .fn()
      .mockRejectedValueOnce(new Error('list boom'))
      .mockResolvedValue({ sessions: [], totalCount: 0 })

    const { result } = renderHook(() => useSessions({ agentView: 'all' }))

    await waitFor(() => expect(result.current.error).toBe('list boom'))
    expect(result.current.loading).toBe(false)
    expect(result.current.sessions).toEqual([])

    // Retry clears the error and re-requests (cache/in-flight were dropped).
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(window.api.sessions.list).toHaveBeenCalledTimes(2)
  })

  it('useSessionDetail surfaces an error when the detail IPC rejects, and reload recovers', async () => {
    window.api.sessions.get = vi
      .fn()
      .mockRejectedValueOnce(new Error('detail boom'))
      .mockResolvedValue(null)

    const { result } = renderHook(() => useSessionDetail('session-1'))

    await waitFor(() => expect(result.current.error).toBe('detail boom'))
    expect(result.current.loading).toBe(false)

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(window.api.sessions.get).toHaveBeenCalledTimes(2)
  })
})
