import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAssets } from '../../src/renderer/src/hooks/use-ipc'
import { useAppStore } from '../../src/renderer/src/stores/app'
import type { Asset, AssetStats } from '../../src/shared/types/asset'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
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
      scanning: false
    })
  })

  it('writes scan results into the shared app store', async () => {
    const stats: AssetStats = { ...emptyStats, skills: 1 }
    window.api.assets.scanAll = async () => ({
      assets: [skillAsset],
      stats,
      errors: []
    })

    const { result } = renderHook(() => useAssets())

    await waitFor(() => {
      expect(useAppStore.getState().assets).toHaveLength(1)
    })

    expect(useAppStore.getState().stats.skills).toBe(1)
    expect(result.current.assets[0].name).toBe('test-skill')
    expect(result.current.stats.skills).toBe(1)
  })
})
