import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMemory, resetMemoryCacheForTests } from '../../src/renderer/src/hooks/use-memory'

describe('useMemory — error channel (GH-118 T3)', () => {
  beforeEach(() => {
    resetMemoryCacheForTests()
  })

  it('surfaces an error when the memory IPC rejects, and refresh recovers', async () => {
    window.api.memory.list = vi
      .fn()
      .mockRejectedValueOnce(new Error('memory boom'))
      .mockResolvedValue({ notes: [], sources: [] })

    const { result } = renderHook(() => useMemory())

    await waitFor(() => expect(result.current.error).toBe('memory boom'))
    expect(result.current.loading).toBe(false)
    expect(result.current.refreshing).toBe(false)

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(window.api.memory.list).toHaveBeenCalledTimes(2)
  })

  it('keeps the previous list on a failed manual refresh (SWR, no clear-screen)', async () => {
    const loaded = {
      notes: [
        {
          id: 'n1',
          sourceId: 's1',
          sourceLabel: 'Source',
          title: 'Note one',
          summary: '',
          tags: [],
          importance: 'active',
          path: '/tmp/n1.md',
          links: [],
          createdAt: null,
          updatedAt: null,
          missing: false
        }
      ],
      sources: []
    }
    window.api.memory.list = vi
      .fn()
      .mockResolvedValueOnce(loaded)
      .mockRejectedValueOnce(new Error('refresh boom'))

    const { result } = renderHook(() => useMemory())
    await waitFor(() => expect(result.current.result.notes).toHaveLength(1))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.error).toBe('refresh boom'))
    expect(result.current.result.notes).toHaveLength(1)
    expect(result.current.refreshing).toBe(false)
  })
})
