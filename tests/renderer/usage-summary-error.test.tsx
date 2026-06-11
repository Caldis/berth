import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useUsageSummary } from '../../src/renderer/src/hooks/use-ipc'

describe('useUsageSummary — error channel (GH-118 T1)', () => {
  it('surfaces an error when the summary IPC rejects, and reload recovers', async () => {
    window.api.usage.summary = vi
      .fn()
      .mockRejectedValueOnce(new Error('usage boom'))
      .mockResolvedValue({ totalTokens: 0, totalCost: 0, dailyCosts: [], costSource: 'unknown' })

    const { result } = renderHook(() => useUsageSummary(7))

    await waitFor(() => expect(result.current.error).toBe('usage boom'))
    expect(result.current.loading).toBe(false)
    expect(result.current.usage).toBeNull()

    act(() => result.current.reload())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(result.current.usage).not.toBeNull()
    expect(window.api.usage.summary).toHaveBeenCalledTimes(2)
  })

  it('keeps the previous summary on a failed re-fetch (SWR, no clear-screen)', async () => {
    window.api.usage.summary = vi
      .fn()
      .mockResolvedValueOnce({ totalTokens: 1, totalCost: 2, dailyCosts: [], costSource: 'actual' })
      .mockRejectedValueOnce(new Error('refresh boom'))

    const { result, rerender } = renderHook(({ days }) => useUsageSummary(days), {
      initialProps: { days: 7 }
    })
    await waitFor(() => expect(result.current.usage).not.toBeNull())

    rerender({ days: 30 })
    await waitFor(() => expect(result.current.error).toBe('refresh boom'))
    expect(result.current.usage).not.toBeNull()
  })
})
