import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetHealthCheckCacheForTests, useHealthChecks } from '../../src/renderer/src/hooks/use-ipc'
import type { HealthCheck } from '@shared/types/ipc'

const firstCheck: HealthCheck = {
  id: 'codex:configuration:first',
  severity: 'info',
  category: 'configuration',
  agentId: 'codex',
  agentName: 'Codex',
  title: 'First',
  message: 'First check'
}

const secondCheck: HealthCheck = {
  id: 'codex:configuration:second',
  severity: 'warning',
  category: 'configuration',
  agentId: 'codex',
  agentName: 'Codex',
  title: 'Second',
  message: 'Second check'
}

describe('useHealthChecks', () => {
  beforeEach(() => {
    vi.useRealTimers()
    resetHealthCheckCacheForTests()
    window.api.assets.onChanged = vi.fn(() => () => {})
  })

  it('refreshes health checks when assets change', async () => {
    let onChanged: (() => void) | null = null
    window.api.assets.healthCheck = vi
      .fn()
      .mockResolvedValueOnce([firstCheck])
      .mockResolvedValueOnce([secondCheck])
    window.api.assets.onChanged = vi.fn((callback: () => void) => {
      onChanged = callback
      return () => {
        onChanged = null
      }
    })

    const { result, unmount } = renderHook(() => useHealthChecks())

    await waitFor(() => {
      expect(result.current.checks).toEqual([firstCheck])
    })
    expect(result.current.stale).toBe(false)
    expect(window.api.assets.healthCheck).toHaveBeenLastCalledWith({ refresh: false })

    await act(async () => {
      onChanged?.()
    })

    await waitFor(() => {
      // GH-113 I1: an assets:changed signal triggers a SOFT refresh (force:false) —
      // re-evaluate health against the incrementally-updated snapshot without a full
      // rescan, which would defeat the per-file incremental write.
      expect(window.api.assets.healthCheck).toHaveBeenLastCalledWith({ refresh: false })
    })

    await waitFor(() => {
      expect(result.current.checks).toEqual([secondCheck])
    })
    expect(result.current.stale).toBe(false)
    expect(result.current.lastCheckedAt).toEqual(expect.any(String))
    expect(window.api.assets.healthCheck).toHaveBeenCalledTimes(2)

    unmount()
    expect(onChanged).toBeNull()
  })

  it('uses the cached result on remount without repeating health checks', async () => {
    window.api.assets.healthCheck = vi.fn(async () => [firstCheck])

    const first = renderHook(() => useHealthChecks())

    await waitFor(() => {
      expect(first.result.current.checks).toEqual([firstCheck])
    })
    first.unmount()

    const second = renderHook(() => useHealthChecks())

    expect(second.result.current.checks).toEqual([firstCheck])
    expect(second.result.current.loading).toBe(false)
    expect(second.result.current.stale).toBe(false)
    expect(window.api.assets.healthCheck).toHaveBeenCalledTimes(1)

    second.unmount()
  })

  it('deduplicates concurrent health check requests', async () => {
    let resolveChecks: (checks: HealthCheck[]) => void = () => {}
    const pending = new Promise<HealthCheck[]>((resolve) => {
      resolveChecks = resolve
    })
    window.api.assets.healthCheck = vi.fn(() => pending)

    const first = renderHook(() => useHealthChecks())
    const second = renderHook(() => useHealthChecks())

    expect(window.api.assets.healthCheck).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveChecks([firstCheck])
      await pending
    })

    await waitFor(() => {
      expect(first.result.current.checks).toEqual([firstCheck])
      expect(second.result.current.checks).toEqual([firstCheck])
    })

    first.unmount()
    second.unmount()
  })

  it('keeps cached checks visible as stale while refreshing after assets change', async () => {
    let onChanged: (() => void) | null = null
    let resolveNext: (checks: HealthCheck[]) => void = () => {}
    const pendingNext = new Promise<HealthCheck[]>((resolve) => {
      resolveNext = resolve
    })
    window.api.assets.healthCheck = vi
      .fn()
      .mockResolvedValueOnce([firstCheck])
      .mockReturnValueOnce(pendingNext)
    window.api.assets.onChanged = vi.fn((callback: () => void) => {
      onChanged = callback
      return () => {
        onChanged = null
      }
    })

    const { result, unmount } = renderHook(() => useHealthChecks())

    await waitFor(() => {
      expect(result.current.checks).toEqual([firstCheck])
    })

    await act(async () => {
      onChanged?.()
    })

    await waitFor(() => {
      expect(result.current.checks).toEqual([firstCheck])
      expect(result.current.loading).toBe(true)
      expect(result.current.stale).toBe(true)
    })

    await act(async () => {
      resolveNext([secondCheck])
      await pendingNext
    })

    await waitFor(() => {
      expect(result.current.checks).toEqual([secondCheck])
      expect(result.current.loading).toBe(false)
      expect(result.current.stale).toBe(false)
    })

    unmount()
  })
})
