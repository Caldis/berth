import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthChecks, resetHealthCheckCacheForTests } from '../../src/renderer/src/hooks/use-ipc'

describe('useHealthChecks — error channel (GH-118 T2)', () => {
  beforeEach(() => {
    resetHealthCheckCacheForTests()
  })

  it('surfaces an error and resets stale when the health IPC rejects, refresh recovers', async () => {
    window.api.assets.healthCheck = vi
      .fn()
      .mockRejectedValueOnce(new Error('health boom'))
      .mockResolvedValue([])

    const { result } = renderHook(() => useHealthChecks())

    await waitFor(() => expect(result.current.error).toBe('health boom'))
    expect(result.current.loading).toBe(false)
    // AC-3: a failed refresh must not leave the stale flag stuck on.
    expect(result.current.stale).toBe(false)

    act(() => result.current.refresh({ force: false }))
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(window.api.assets.healthCheck).toHaveBeenCalledTimes(2)
  })

  it('keeps the previous checks on a failed soft refresh (SWR, no clear-screen)', async () => {
    const check = { id: 'c1', severity: 'warning', title: 'one' }
    window.api.assets.healthCheck = vi
      .fn()
      .mockResolvedValueOnce([check])
      .mockRejectedValueOnce(new Error('soft boom'))

    const { result } = renderHook(() => useHealthChecks())
    await waitFor(() => expect(result.current.checks).toHaveLength(1))

    act(() => result.current.refresh({ force: true }))
    await waitFor(() => expect(result.current.error).toBe('soft boom'))
    expect(result.current.checks).toHaveLength(1)
    expect(result.current.stale).toBe(false)
  })
})
