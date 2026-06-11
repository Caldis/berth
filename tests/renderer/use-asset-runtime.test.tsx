import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssetRuntime } from '../../src/renderer/src/hooks/use-ipc'
import { IDLE_ASSET_RUNTIME_STATUS, useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset, AssetStats } from '@shared/types/asset'
import type { AssetRuntimeStatus, AssetSnapshot } from '@shared/types/ipc'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
}

const skillAsset: Asset = {
  id: 'skill-runtime',
  agentId: 'codex',
  category: 'instruction',
  type: 'skill',
  scope: 'user',
  name: 'runtime-skill',
  path: '/tmp/SKILL.md',
  meta: {}
}

const scanningStatus: AssetRuntimeStatus = {
  state: 'scanning',
  reason: 'startup',
  stale: false,
  progress: { phase: 'parsing', current: 1, total: 3 }
}

const readyStatus: AssetRuntimeStatus = {
  state: 'ready',
  stale: false,
  lastCompletedAt: '2026-06-03T00:00:00.000Z'
}

function snapshot(status: AssetRuntimeStatus, assets: Asset[] = []): AssetSnapshot {
  return {
    id: status.state === 'ready' ? 'snapshot-ready' : 'initial',
    assets,
    stats: {
      skills: assets.length,
      mcpServers: 0,
      sessions: 0,
      plugins: 0,
      hooks: 0,
      commands: 0,
      subagents: 0,
    },
    errors: [],
    sources: [],
    projectCandidates: [],
    status
  }
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('useAssetRuntime', () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [],
      assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
      assetSnapshotId: null,
      assetErrors: [],
    })
  })

  it('starts a runtime refresh and stores the completed snapshot', async () => {
    const completedRefresh = createDeferred<AssetRuntimeStatus>()
    window.api.assets.status = vi.fn(async () => ({ state: 'idle', stale: false }))
    window.api.assets.snapshot = vi
      .fn()
      .mockResolvedValueOnce(snapshot({ state: 'idle', stale: false }))
      .mockResolvedValue(snapshot(readyStatus, [skillAsset]))
    window.api.assets.refresh = vi
      .fn()
      .mockResolvedValueOnce(scanningStatus)
      .mockReturnValueOnce(completedRefresh.promise)

    const { result } = renderHook(() => useAssetRuntime())

    await waitFor(() => {
      expect(window.api.assets.refresh).toHaveBeenCalledWith({ wait: false })
    })
    expect(result.current.loading).toBe(true)

    completedRefresh.resolve(readyStatus)

    await waitFor(() => {
      expect(useAppStore.getState().assetSnapshotId).toBe('snapshot-ready')
    })
    expect(useAppStore.getState().assets[0]?.name).toBe('runtime-skill')
    expect(useAppStore.getState().assetRuntimeStatus.state).toBe('ready')
  })

  it('streams live partial assets from assets:progress into the store (P4.6)', async () => {
    let progressHandler:
      | ((payload: { status: AssetRuntimeStatus; partial?: { assets: Asset[]; stats: AssetStats } }) => void)
      | null = null
    window.api.assets.status = vi.fn(async () => ({ state: 'idle', stale: false }))
    window.api.assets.snapshot = vi.fn(async () => snapshot({ state: 'idle', stale: false }))
    window.api.assets.refresh = vi.fn(async () => scanningStatus)
    window.api.assets.onProgress = vi.fn((handler) => {
      progressHandler = handler as typeof progressHandler
      return () => {}
    })

    renderHook(() => useAssetRuntime())

    await waitFor(() => {
      expect(progressHandler).not.toBeNull()
    })

    act(() => {
      progressHandler?.({
        status: scanningStatus,
        partial: { assets: [skillAsset], stats: { ...emptyStats, skills: 1 } }
      })
    })

    await waitFor(() => {
      expect(useAppStore.getState().assets[0]?.name).toBe('runtime-skill')
    })
    // Partial stream keeps the store in the scanning state.
    expect(useAppStore.getState().assetRuntimeStatus.state).toBe('scanning')
  })
})
