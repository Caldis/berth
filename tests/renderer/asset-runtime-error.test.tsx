import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssetRuntimeBootstrap } from '../../src/renderer/src/hooks/use-ipc'
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

describe('useAssetRuntimeBootstrap — error channel (GH-118 T4)', () => {
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

    const { result } = renderHook(() => useAssetRuntimeBootstrap())

    await waitFor(() => expect(result.current.error).toBe('bootstrap boom'))

    act(() => result.current.retry())
    // Wait on the strong condition (second call happened) — retry clears `error`
    // synchronously, so error===null alone would race the re-bootstrap.
    await waitFor(() => expect(window.api.assets.status).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  // GH-153 T8: refresh 转 hook 内部 (bootstrap 在 idle/stale/error 状态自动触发) —
  // 失败仍走同一 error 通道; retry 重跑 bootstrap 后恢复。
  it('surfaces an automatic bootstrap refresh failure through the same channel', async () => {
    const idleStatus = { state: 'idle' as const, stale: false }
    window.api.assets.status = vi.fn(async () => idleStatus)
    // 快照自带 status 会在 syncSnapshot 时覆盖 store 状态 — 保持 idle 才会触发条件首刷。
    window.api.assets.snapshot = vi.fn(async () => ({ ...emptySnapshot, status: idleStatus }))
    window.api.assets.refresh = vi.fn().mockRejectedValue(new Error('refresh boom'))

    const { result } = renderHook(() => useAssetRuntimeBootstrap())
    await waitFor(() => expect(result.current.error).toBe('refresh boom'))

    // A later successful bootstrap (via retry) clears the error.
    window.api.assets.refresh = vi.fn(async () => readyStatus)
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.error).toBeNull())
  })
})
