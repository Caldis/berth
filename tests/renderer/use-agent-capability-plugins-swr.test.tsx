import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetAgentCapabilityPluginCacheForTests,
  useAgentCapabilityPlugins
} from '../../src/renderer/src/hooks/use-ipc'
import { EMPTY_ASSET_STATS, IDLE_ASSET_RUNTIME_STATUS, useAppStore } from '../../src/renderer/src/stores/app'
import type { AgentCapabilityPlugin } from '../../src/shared/types/agent-plugin'
import type { AssetSnapshot } from '../../src/shared/types/ipc'

function plugin(id: string, displayName: string): AgentCapabilityPlugin {
  return {
    id,
    displayName,
    version: '0.1.0',
    schemaVersion: 1,
    builtin: false,
    enabled: true,
    detected: true,
    agentCompatibility: {
      agentId: id,
      name: displayName
    },
    capabilities: [],
    permissions: [],
    sourceDescriptors: [],
    assetDescriptors: [],
    hookSchema: {
      agentId: id,
      events: [],
      handlers: []
    },
    healthCheckDescriptors: [],
    sourceCoverage: {
      total: 0,
      counts: {
        scanned: 0,
        missing: 0,
        'not-scanned': 0
      },
      sources: []
    },
    references: []
  }
}

function snapshot(id: string): AssetSnapshot {
  return {
    id,
    assets: [],
    stats: EMPTY_ASSET_STATS,
    errors: [],
    sources: [],
    projectCandidates: [],
    status: IDLE_ASSET_RUNTIME_STATUS
  }
}

describe('useAgentCapabilityPlugins', () => {
  beforeEach(() => {
    resetAgentCapabilityPluginCacheForTests()
    useAppStore.setState({
      assets: [],
      stats: EMPTY_ASSET_STATS,
      assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
      assetSnapshotId: null,
      assetErrors: [],
      lastAssetRefreshAt: null,
      scanning: false
    })
  })

  it('shows cached plugins immediately while refreshing on remount', async () => {
    const cachedPlugin = plugin('cached-agent', 'Cached Agent')
    const freshPlugin = plugin('fresh-agent', 'Fresh Agent')
    window.api.agentPlugins.list = vi.fn(async () => ({
      plugins: [cachedPlugin],
      manifests: []
    }))

    const first = renderHook(() => useAgentCapabilityPlugins())

    await waitFor(() => {
      expect(first.result.current.plugins).toEqual([cachedPlugin])
    })
    expect(first.result.current.loading).toBe(false)
    expect(first.result.current.stale).toBe(false)
    first.unmount()

    let resolveFresh: (value: { plugins: AgentCapabilityPlugin[]; manifests: [] }) => void = () => {}
    const pendingFresh = new Promise<{ plugins: AgentCapabilityPlugin[]; manifests: [] }>((resolve) => {
      resolveFresh = resolve
    })
    window.api.agentPlugins.list = vi.fn(() => pendingFresh)

    const second = renderHook(() => useAgentCapabilityPlugins())

    expect(second.result.current.plugins).toEqual([cachedPlugin])
    expect(second.result.current.loading).toBe(true)
    expect(second.result.current.stale).toBe(true)

    await act(async () => {
      resolveFresh({ plugins: [freshPlugin], manifests: [] })
      await pendingFresh
    })

    await waitFor(() => {
      expect(second.result.current.plugins).toEqual([freshPlugin])
      expect(second.result.current.loading).toBe(false)
      expect(second.result.current.stale).toBe(false)
    })
  })

  it('refreshes after asset snapshot changes without clearing current plugins', async () => {
    const firstPlugin = plugin('first-agent', 'First Agent')
    const secondPlugin = plugin('second-agent', 'Second Agent')
    let resolveRefresh: (value: { plugins: AgentCapabilityPlugin[]; manifests: [] }) => void = () => {}
    const pendingRefresh = new Promise<{ plugins: AgentCapabilityPlugin[]; manifests: [] }>((resolve) => {
      resolveRefresh = resolve
    })
    window.api.agentPlugins.list = vi
      .fn()
      .mockResolvedValueOnce({ plugins: [firstPlugin], manifests: [] })
      .mockReturnValueOnce(pendingRefresh)

    const { result } = renderHook(() => useAgentCapabilityPlugins())

    await waitFor(() => {
      expect(result.current.plugins).toEqual([firstPlugin])
    })

    await act(async () => {
      useAppStore.getState().setAssetSnapshot(snapshot('snapshot-2'))
    })

    await waitFor(() => {
      expect(window.api.agentPlugins.list).toHaveBeenCalledTimes(2)
    })
    expect(result.current.plugins).toEqual([firstPlugin])
    expect(result.current.loading).toBe(true)
    expect(result.current.stale).toBe(true)

    await act(async () => {
      resolveRefresh({ plugins: [secondPlugin], manifests: [] })
      await pendingRefresh
    })

    await waitFor(() => {
      expect(result.current.plugins).toEqual([secondPlugin])
      expect(result.current.loading).toBe(false)
      expect(result.current.stale).toBe(false)
    })
  })
})
