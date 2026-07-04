import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetUsageSummaryCacheForTests,
  useUsageSummary
} from '../../src/renderer/src/hooks/use-ipc'
import { emptyUsageSummary } from '@shared/usage-summary'
import type { UsageSummary } from '@shared/types/asset'

// GH-153 T5: usage.summary 是主进程全量 session 成本聚合的重 IPC。5 个 usage widget
// 同参并发曾各发一路 (违背 insights-context 声明的性能不变量) — 同 key 必须共享。
describe('useUsageSummary SWR dedup (GH-153 T5)', () => {
  beforeEach(() => {
    resetUsageSummaryCacheForTests()
    vi.restoreAllMocks()
  })

  function summaryOf(totalCost: number): UsageSummary {
    return { ...emptyUsageSummary(), totalCost }
  }

  it('shares one IPC round-trip across concurrent same-parameter instances', async () => {
    window.api.usage.summary = vi.fn(async () => summaryOf(12))

    const first = renderHook(() => useUsageSummary(30, 'all', undefined))
    const second = renderHook(() => useUsageSummary(30, 'all', undefined))
    const third = renderHook(() => useUsageSummary(30, 'all', undefined))

    await waitFor(() => {
      expect(first.result.current.usage?.totalCost).toBe(12)
      expect(second.result.current.usage?.totalCost).toBe(12)
      expect(third.result.current.usage?.totalCost).toBe(12)
    })
    expect(window.api.usage.summary).toHaveBeenCalledTimes(1)
    expect(window.api.usage.summary).toHaveBeenCalledWith({ days: 30 })

    first.unmount()
    second.unmount()
    third.unmount()
  })

  it('serves the cached value on remount within TTL without a second IPC', async () => {
    window.api.usage.summary = vi.fn(async () => summaryOf(7))

    const first = renderHook(() => useUsageSummary(30, 'all', undefined))
    await waitFor(() => expect(first.result.current.usage?.totalCost).toBe(7))
    first.unmount()

    const second = renderHook(() => useUsageSummary(30, 'all', undefined))
    expect(second.result.current.usage?.totalCost).toBe(7)
    expect(second.result.current.loading).toBe(false)
    expect(window.api.usage.summary).toHaveBeenCalledTimes(1)
    second.unmount()
  })

  it('fetches independently per parameter set (days ranges do not collide)', async () => {
    window.api.usage.summary = vi.fn(async (request: { days: number }) => summaryOf(request.days))

    const short = renderHook(() => useUsageSummary(30, 'all', undefined))
    const long = renderHook(() => useUsageSummary(90, 'all', undefined))

    await waitFor(() => {
      expect(short.result.current.usage?.totalCost).toBe(30)
      expect(long.result.current.usage?.totalCost).toBe(90)
    })
    expect(window.api.usage.summary).toHaveBeenCalledTimes(2)

    short.unmount()
    long.unmount()
  })

  // GH-153 T6: usage 页复用本 hook 需要 costMode — 透传进请求体, 且参与缓存 key 分流。
  it('forwards costMode into the request body (GH-153 T6)', async () => {
    window.api.usage.summary = vi.fn(async () => summaryOf(3))

    const { unmount } = renderHook(() => useUsageSummary(0, 'all', undefined, 'estimated'))
    await waitFor(() =>
      expect(window.api.usage.summary).toHaveBeenCalledWith({ days: 0, costMode: 'estimated' })
    )
    unmount()
  })

  it('keys the cache by costMode so modes do not collide (GH-153 T6)', async () => {
    window.api.usage.summary = vi.fn(async (request: { costMode?: string }) =>
      summaryOf(request.costMode === 'actual' ? 1 : 2)
    )

    const actual = renderHook(() => useUsageSummary(0, 'all', undefined, 'actual'))
    const estimated = renderHook(() => useUsageSummary(0, 'all', undefined, 'estimated'))
    await waitFor(() => {
      expect(actual.result.current.usage?.totalCost).toBe(1)
      expect(estimated.result.current.usage?.totalCost).toBe(2)
    })
    expect(window.api.usage.summary).toHaveBeenCalledTimes(2)
    actual.unmount()
    estimated.unmount()
  })

  it('reload invalidates the cache and refetches', async () => {
    window.api.usage.summary = vi.fn(async () => summaryOf(1))

    const { result, unmount } = renderHook(() => useUsageSummary(30, 'all', undefined))
    await waitFor(() => expect(result.current.usage?.totalCost).toBe(1))

    await act(async () => {
      result.current.reload()
    })
    await waitFor(() => expect(window.api.usage.summary).toHaveBeenCalledTimes(2))
    unmount()
  })
})
