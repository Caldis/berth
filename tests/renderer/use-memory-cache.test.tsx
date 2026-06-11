import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MEMORY_LIST_CACHE_TTL_MS,
  resetMemoryCacheForTests,
  useMemory
} from '../../src/renderer/src/hooks/use-memory'
import type { MemoryListResult, MemoryNote } from '@shared/types/memory'

function note(id: string, title: string): MemoryNote {
  return {
    id,
    sourceId: 'united-memory',
    sourceLabel: 'United Memory',
    title,
    summary: `${title} summary`,
    tags: ['ops'],
    importance: 'active',
    path: `D:/memory/${id}.md`,
    links: [],
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z'
  }
}

function result(notes: MemoryNote[]): MemoryListResult {
  return {
    notes,
    sources: [
      {
        id: 'united-memory',
        label: 'United Memory',
        available: true,
        rootPath: 'D:/memory',
        noteCount: notes.length
      }
    ]
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

describe('useMemory cache', () => {
  beforeEach(() => {
    resetMemoryCacheForTests()
    vi.restoreAllMocks()
    window.api.memory = {
      list: vi.fn(async () => result([])),
      get: vi.fn(async () => null)
    }
  })

  it('reuses fresh memory cache without remount refresh', async () => {
    const cached = result([note('note-1', 'Cached memory')])
    window.api.memory.list = vi.fn(async () => cached)

    const first = renderHook(() => useMemory())

    await waitFor(() => {
      expect(first.result.current.result).toEqual(cached)
      expect(first.result.current.loading).toBe(false)
      expect(first.result.current.refreshing).toBe(false)
    })
    first.unmount()

    const second = renderHook(() => useMemory())

    expect(second.result.current.result).toEqual(cached)
    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.refreshing).toBe(false)
    expect(window.api.memory.list).toHaveBeenCalledTimes(1)
  })

  it('keeps cached memory visible while stale cache refreshes', async () => {
    const cached = result([note('note-1', 'Cached memory')])
    const refreshed = result([note('note-2', 'Refreshed memory')])
    const refresh = deferred<MemoryListResult>()
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    window.api.memory.list = vi
      .fn()
      .mockResolvedValueOnce(cached)
      .mockReturnValueOnce(refresh.promise)

    const first = renderHook(() => useMemory())

    await waitFor(() => {
      expect(first.result.current.result).toEqual(cached)
      expect(first.result.current.loading).toBe(false)
    })
    first.unmount()

    now.mockReturnValue(1_000 + MEMORY_LIST_CACHE_TTL_MS + 1)
    const second = renderHook(() => useMemory())

    expect(second.result.current.result).toEqual(cached)
    await waitFor(() => {
      expect(second.result.current.loading).toBe(false)
      expect(second.result.current.refreshing).toBe(true)
    })

    await act(async () => {
      refresh.resolve(refreshed)
      await refresh.promise
    })

    await waitFor(() => {
      expect(second.result.current.result).toEqual(refreshed)
      expect(second.result.current.refreshing).toBe(false)
    })
    expect(window.api.memory.list).toHaveBeenCalledTimes(2)
  })

  it('manual refresh forces a request but preserves the same result reference when unchanged', async () => {
    const cached = result([note('note-1', 'Cached memory')])
    window.api.memory.list = vi
      .fn()
      .mockResolvedValueOnce(cached)
      .mockResolvedValueOnce(result([{ ...cached.notes[0] }]))

    const view = renderHook(() => useMemory())

    await waitFor(() => {
      expect(view.result.current.result).toEqual(cached)
      expect(view.result.current.loading).toBe(false)
    })
    const cachedResult = view.result.current.result

    await act(async () => {
      view.result.current.refresh()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(view.result.current.refreshing).toBe(false)
    })
    expect(view.result.current.result).toBe(cachedResult)
    expect(window.api.memory.list).toHaveBeenCalledTimes(2)
  })
})
