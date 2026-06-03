import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAssets } from '../../src/renderer/src/hooks/use-ipc'
import { IDLE_ASSET_RUNTIME_STATUS, useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset, AssetStats } from '../../src/shared/types/asset'
import type { AssetSnapshot } from '../../src/shared/types/ipc'

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
  id: 'skill-test',
  agentId: 'claude-code',
  category: 'instruction',
  type: 'skill',
  scope: 'user',
  name: 'test-skill',
  path: 'C:\\Users\\test\\.claude\\skills\\test-skill\\SKILL.md',
  meta: {}
}

describe('useAssets', () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [],
      stats: emptyStats,
      assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
      assetSnapshotId: null,
      assetErrors: [],
      lastAssetRefreshAt: null,
      scanning: false
    })
  })

  it('writes runtime snapshot results into the shared app store', async () => {
    const stats: AssetStats = { ...emptyStats, skills: 1 }
    const snapshot: AssetSnapshot = {
      id: 'snapshot-assets',
      assets: [skillAsset],
      stats,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: {
        state: 'ready',
        stale: false,
        lastCompletedAt: '2026-06-03T00:00:00.000Z'
      }
    }
    window.api.assets.status = async () => snapshot.status
    window.api.assets.snapshot = async () => snapshot

    const { result } = renderHook(() => useAssets())

    await waitFor(() => {
      expect(useAppStore.getState().assets).toHaveLength(1)
    })

    expect(useAppStore.getState().stats.skills).toBe(1)
    expect(useAppStore.getState().assetSnapshotId).toBe('snapshot-assets')
    expect(result.current.assets[0].name).toBe('test-skill')
    expect(result.current.stats.skills).toBe(1)
  })
})
