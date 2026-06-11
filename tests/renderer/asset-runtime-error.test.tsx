import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssetRuntime } from '../../src/renderer/src/hooks/use-ipc'
import { useAppStore } from '../../src/renderer/src/stores/app'

const readyStatus = { state: 'ready' as const, stale: false }
const emptySnapshot = {
  id: 'snap-test',
  assets: [],
  stats: { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
  errors: [],
  sources: [],
  projectCandidates: [],
  status: readyStatus
}

describe('useAssetRuntime — error channel (GH-118 T4)', () => {
  beforeEach(() => {
    useAppStore.setState({ assets: [], assetRuntimeStatus: readyStatus })
    window.api.assets.status = vi.fn(async () => readyStatus)
    window.api.assets.snapshot = vi.fn(async () => emptySnapshot)
    window.api.assets.refresh = vi.fn(async () => readyStatus)
  })

  it('surfaces an error when the initial status/snapshot chain rejects, and retry recovers', async () => {
    window.api.assets.status = vi
      .fn()
      .mockRejectedValueOnce(new Error('bootstrap boom'))
      .mockResolvedValue(readyStatus)

    const { result } = renderHook(() => useAssetRuntime())

    await waitFor(() => expect(result.current.error).toBe('bootstrap boom'))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(window.api.assets.status).toHaveBeenCalledTimes(2)
  })

  it('surfaces a manual refresh failure through the same channel', async () => {
    window.api.assets.refresh = vi.fn().mockRejectedValue(new Error('refresh boom'))

    const { result } = renderHook(() => useAssetRuntime())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.error).toBe('refresh boom'))

    // A later successful refresh clears the error.
    window.api.assets.refresh = vi.fn(async () => readyStatus)
    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.error).toBeNull())
  })
})
