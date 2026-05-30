import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHealthChecks } from '../../src/renderer/src/hooks/use-ipc'
import type { HealthCheck } from '../../src/shared/types/ipc'

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

    await act(async () => {
      onChanged?.()
    })

    await waitFor(() => {
      expect(result.current.checks).toEqual([secondCheck])
    })
    expect(result.current.lastCheckedAt).toEqual(expect.any(String))
    expect(window.api.assets.healthCheck).toHaveBeenCalledTimes(2)

    unmount()
    expect(onChanged).toBeNull()
  })
})
