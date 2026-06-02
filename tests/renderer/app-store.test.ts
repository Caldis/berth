import { describe, expect, it, beforeEach } from 'vitest'
import { DEFAULT_SCOPE_SELECTION, createProjectScopeCandidate } from '../../src/shared/scope'
import { SIDEBAR_DEFAULT_WIDTH, useAppStore } from '../../src/renderer/src/stores/app'

describe('useAppStore scope state', () => {
  beforeEach(() => {
    useAppStore.setState({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      scopeSelection: DEFAULT_SCOPE_SELECTION,
      projectCandidates: []
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
})
