import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '../../src/shared/scope'
import { EMPTY_ASSET_STATS, IDLE_ASSET_RUNTIME_STATUS, SIDEBAR_DEFAULT_WIDTH, useAppStore } from '../../src/renderer/src/stores/app'
import type { AssetRuntimeStatus, AssetSnapshot } from '../../src/shared/types/ipc'

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
      assetErrors: []
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
  })

  it('stores asset runtime status; scanning is derived from status.state at read sites (GH-115 T4)', () => {
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
    expect(useAppStore.getState().assetRuntimeStatus.state === 'scanning').toBe(true)

    useAppStore.getState().setAssetRuntimeStatus({
      state: 'ready',
      stale: false,
      lastCompletedAt: '2026-06-03T00:00:01.000Z'
    })

    expect(useAppStore.getState().assetRuntimeStatus.state === 'scanning').toBe(false)
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
  })

  it('folds a partial scan tick into assets/stats without bumping the snapshot id (P4.6)', () => {
    useAppStore.setState({ assetSnapshotId: 'snapshot-stable' })
    const scanning: AssetRuntimeStatus = {
      state: 'scanning',
      reason: 'startup',
      stale: false,
      progress: { phase: 'parsing', current: 1, total: 2, label: 'Claude Code' }
    }

    useAppStore.getState().applyAssetProgress({
      status: scanning,
      partial: {
        assets: [{
          id: 'skill-live',
          agentId: 'claude-code',
          category: 'instruction',
          type: 'skill',
          scope: 'user',
          name: 'live-skill',
          path: '/x/SKILL.md',
          meta: {}
        }],
        stats: { ...EMPTY_ASSET_STATS, skills: 1 }
      }
    })

    expect(useAppStore.getState().assetRuntimeStatus.state).toBe('scanning')
    expect(useAppStore.getState().assets.map((a) => a.id)).toEqual(['skill-live'])
    expect(useAppStore.getState().stats.skills).toBe(1)
    // Snapshot id stays frozen during the scan so plugin consumers don't re-fetch.
    expect(useAppStore.getState().assetSnapshotId).toBe('snapshot-stable')
  })

  it('applies a progress-only tick (no partial) without clobbering existing assets (P4.6)', () => {
    useAppStore.setState({
      assets: [{
        id: 'existing',
        agentId: 'codex',
        category: 'state',
        type: 'session',
        scope: 'session',
        name: 'existing',
        path: '/x.jsonl',
        meta: {}
      }]
    })

    useAppStore.getState().applyAssetProgress({
      status: { state: 'scanning', reason: 'watcher', stale: true, progress: { phase: 'indexing', current: 0, total: 1 } }
    })

    expect(useAppStore.getState().assets.map((a) => a.id)).toEqual(['existing'])
    expect(useAppStore.getState().assetRuntimeStatus.progress?.phase).toBe('indexing')
  })

  it('keeps shallow (other-project) assets across a deep-only partial tick (GH-113 global flicker fix)', () => {
    // The scanner streams deep-only partials; other projects' shallow conventions/
    // capabilities arrive only in the final snapshot. A raw partial would drop them
    // mid-scan and flicker the global scope in and out. Existing shallow assets must
    // survive a partial that doesn't carry them.
    useAppStore.setState({
      assets: [
        {
          id: 'shallow-conv',
          agentId: 'claude-code',
          category: 'instruction',
          type: 'claude-md',
          scope: 'project',
          name: 'CLAUDE.md',
          path: '/other/CLAUDE.md',
          meta: { scanDepth: 'shallow', projectPath: '/other' }
        }
      ]
    })

    useAppStore.getState().applyAssetProgress({
      status: { state: 'scanning', reason: 'watcher', stale: false, progress: { phase: 'parsing', current: 1, total: 2 } },
      partial: {
        assets: [
          {
            id: 'skill-live',
            agentId: 'claude-code',
            category: 'instruction',
            type: 'skill',
            scope: 'user',
            name: 'live',
            path: '/x/SKILL.md',
            meta: {}
          }
        ],
        stats: { ...EMPTY_ASSET_STATS, skills: 1 }
      }
    })

    const ids = useAppStore.getState().assets.map((a) => a.id)
    expect(ids).toContain('skill-live')
    expect(ids).toContain('shallow-conv')
  })

  it('keeps shallow assets when a mid-scan snapshot is read via syncSnapshot (GH-113 cap-4 flicker, setAssetSnapshot path)', () => {
    // assets:changed (cap-4) → onChanged → syncSnapshot → setAssetSnapshot reads the
    // MAIN snapshot, which mid-scan carries only the deep set (scanner appends other-
    // project shallow to the FINAL snapshot). Without preserving shallow on this path
    // too, the global scope flickers — same failure as the progress path, different route.
    useAppStore.setState({
      assets: [{
        id: 'shallow-conv', agentId: 'claude-code', category: 'instruction', type: 'claude-md',
        scope: 'project', name: 'CLAUDE.md', path: '/other/CLAUDE.md',
        meta: { scanDepth: 'shallow', projectPath: '/other' }
      }]
    })

    useAppStore.getState().setAssetSnapshot({
      id: 'mid-scan',
      assets: [{
        id: 'skill-live', agentId: 'claude-code', category: 'capability', type: 'skill',
        scope: 'project', name: 'live', path: '/active/skill.md', meta: {}
      }],
      stats: EMPTY_ASSET_STATS,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'scanning', reason: 'watcher', stale: true }
    })

    const ids = useAppStore.getState().assets.map((a) => a.id)
    expect(ids).toContain('skill-live')
    expect(ids).toContain('shallow-conv') // shallow survives a mid-scan deep-only read
  })

  it('replaces wholesale when a terminal snapshot already carries shallow (no stale shallow lingers)', () => {
    useAppStore.setState({
      assets: [{
        id: 'old-shallow', agentId: 'claude-code', category: 'instruction', type: 'claude-md',
        scope: 'project', name: 'CLAUDE.md', path: '/old/CLAUDE.md',
        meta: { scanDepth: 'shallow', projectPath: '/old' }
      }]
    })

    useAppStore.getState().setAssetSnapshot({
      id: 'final',
      assets: [
        { id: 'deep-skill', agentId: 'claude-code', category: 'capability', type: 'skill', scope: 'project', name: 's', path: '/a/s.md', meta: {} },
        { id: 'fresh-shallow', agentId: 'claude-code', category: 'instruction', type: 'claude-md', scope: 'project', name: 'CLAUDE.md', path: '/other/CLAUDE.md', meta: { scanDepth: 'shallow', projectPath: '/other' } }
      ],
      stats: EMPTY_ASSET_STATS,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'ready', stale: false, lastCompletedAt: '2026-06-09T00:00:00.000Z' }
    })

    const ids = useAppStore.getState().assets.map((a) => a.id).sort()
    expect(ids).toEqual(['deep-skill', 'fresh-shallow']) // wholesale: stale shallow gone, no dup
  })
})
