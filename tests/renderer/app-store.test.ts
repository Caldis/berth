import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '../../src/shared/scope'
import { EMPTY_ASSET_STATS, IDLE_ASSET_RUNTIME_STATUS, SIDEBAR_DEFAULT_WIDTH, useAppStore } from '../../src/renderer/src/stores/app'
import type { AssetSnapshot } from '../../src/shared/types/ipc'

describe('useAppStore scope state', () => {
  beforeEach(() => {
    useAppStore.setState({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      scopeSelection: DEFAULT_SCOPE_SELECTION,
      projectCandidates: [],
      assets: [],
      stats: EMPTY_ASSET_STATS,
      assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
      assetSnapshotId: null,
      assetErrors: [],
      lastAssetRefreshAt: null,
      scanning: false
    })
  })

  it('stores a normalized project scope selection', () => {
    useAppStore.getState().setScopeSelection({ mode: 'project', projectPath: 'D:\\Code\\berth\\' })

    expect(useAppStore.getState().scopeSelection).toEqual({
      mode: 'project',
      projectPath: 'D:/Code/berth',
      projectPathKey: 'd:/code/berth'
    })
  })

  it('returns to global when an invalid project scope is provided', () => {
    useAppStore.getState().setScopeSelection({ mode: 'project', projectPath: '   ' })

    expect(useAppStore.getState().scopeSelection).toEqual({ mode: 'global' })
  })

  it('deduplicates project candidates before storing them', () => {
    const first = createProjectScopeCandidate({ path: 'D:\\Code\\berth', source: 'current', sessionCount: 1 })
    const second = createProjectScopeCandidate({ path: 'd:/code/berth', source: 'session', sessionCount: 2 })

    useAppStore.getState().setProjectCandidates([first, second].filter((item) => item != null))

    expect(useAppStore.getState().projectCandidates).toHaveLength(1)
    expect(useAppStore.getState().projectCandidates[0].sources).toEqual(['current', 'session'])
    expect(useAppStore.getState().projectCandidates[0].sessionCount).toBe(3)
  })

  it('initializes asset runtime state without exposing scan job internals', () => {
    const state = useAppStore.getState()

    expect(state.assetRuntimeStatus).toEqual({
      state: 'idle',
      stale: false
    })
    expect(state.assetSnapshotId).toBeNull()
    expect(state.assetErrors).toEqual([])
    expect(state.lastAssetRefreshAt).toBeNull()
    expect(state.scanning).toBe(false)
  })

  it('stores asset runtime status and mirrors active scanning for legacy callers', () => {
    useAppStore.getState().setAssetRuntimeStatus({
      state: 'scanning',
      reason: 'startup',
      startedAt: '2026-06-03T00:00:00.000Z',
      stale: false,
      progress: {
        phase: 'parsing',
        current: 3,
        total: 10,
        label: 'sessions'
      }
    })

    expect(useAppStore.getState().assetRuntimeStatus).toMatchObject({
      state: 'scanning',
      reason: 'startup',
      progress: {
        phase: 'parsing',
        current: 3,
        total: 10
      }
    })
    expect(useAppStore.getState().scanning).toBe(true)

    useAppStore.getState().setAssetRuntimeStatus({
      state: 'ready',
      stale: false,
      lastCompletedAt: '2026-06-03T00:00:01.000Z'
    })

    expect(useAppStore.getState().scanning).toBe(false)
    expect(useAppStore.getState().lastAssetRefreshAt).toBe('2026-06-03T00:00:01.000Z')
  })

  it('stores asset snapshot metadata with assets, stats, errors, and candidates', () => {
    const candidate = createProjectScopeCandidate({ path: 'D:\\Code\\berth', source: 'current', sessionCount: 1 })
    const snapshot: AssetSnapshot = {
      id: 'snapshot-1',
      assets: [{
        id: 'session-1',
        agentId: 'codex',
        category: 'state',
        type: 'session',
        scope: 'session',
        name: 'Session',
        path: '/tmp/session.jsonl',
        meta: {}
      }],
      stats: {
        ...EMPTY_ASSET_STATS,
        sessions: 1
      },
      errors: [{
        path: '/tmp/broken.jsonl',
        type: 'parse',
        message: 'Invalid JSONL'
      }],
      sources: [],
      projectCandidates: candidate ? [candidate] : [],
      status: {
        state: 'ready',
        stale: false,
        lastCompletedAt: '2026-06-03T00:00:02.000Z'
      }
    }

    useAppStore.getState().setAssetSnapshot(snapshot)

    expect(useAppStore.getState().assetSnapshotId).toBe('snapshot-1')
    expect(useAppStore.getState().assets).toHaveLength(1)
    expect(useAppStore.getState().stats.sessions).toBe(1)
    expect(useAppStore.getState().assetErrors).toEqual(snapshot.errors)
    expect(useAppStore.getState().projectCandidates).toHaveLength(1)
    expect(useAppStore.getState().lastAssetRefreshAt).toBe('2026-06-03T00:00:02.000Z')
  })
})
