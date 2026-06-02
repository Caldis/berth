import { describe, expect, it } from 'vitest'
import {
  createProjectScopeCandidate,
  mergeProjectScopeCandidates,
  normalizeProjectPath,
  normalizeProjectPathKey,
  normalizeScopeSelection,
  sameProjectPath
} from '../../src/shared/scope'

describe('project scope helpers', () => {
  it('normalizes Windows paths to a stable case-insensitive key', () => {
    expect(normalizeProjectPath('C:\\Users\\mail\\Project\\')).toBe('C:/Users/mail/Project')
    expect(normalizeProjectPathKey('C:\\Users\\mail\\Project\\')).toBe('c:/users/mail/project')
    expect(sameProjectPath('C:\\Users\\mail\\Project', 'c:/users/mail/project/')).toBe(true)
  })

  it('does not lowercase POSIX paths', () => {
    expect(normalizeProjectPathKey('/Users/mail/Project')).toBe('/Users/mail/Project')
    expect(sameProjectPath('/Users/mail/Project', '/users/mail/project')).toBe(false)
  })

  it('falls back to global when project scope has no path', () => {
    expect(normalizeScopeSelection({ mode: 'project', projectPath: '' })).toEqual({ mode: 'global' })
  })

  it('creates stable project candidates from paths', () => {
    expect(createProjectScopeCandidate({ path: 'D:\\Code\\berth', source: 'current', sessionCount: 2 })).toEqual({
      id: 'project:d:/code/berth',
      path: 'D:/Code/berth',
      pathKey: 'd:/code/berth',
      name: 'berth',
      displayPath: 'D:/Code/berth',
      sources: ['current'],
      lastSeenAt: undefined,
      sessionCount: 2
    })
  })

  it('merges duplicate candidates and sorts active projects first', () => {
    const first = createProjectScopeCandidate({
      path: 'D:\\Code\\berth',
      source: 'current',
      lastSeenAt: '2026-06-01T00:00:00.000Z',
      sessionCount: 1
    })
    const second = createProjectScopeCandidate({
      path: 'd:/code/berth/',
      source: 'session',
      lastSeenAt: '2026-06-02T00:00:00.000Z',
      sessionCount: 3
    })
    const other = createProjectScopeCandidate({ path: 'D:\\Code\\bobcorn', source: 'session', sessionCount: 1 })

    const merged = mergeProjectScopeCandidates([first, second, other].filter((item) => item != null))

    expect(merged.map((candidate) => candidate.pathKey)).toEqual(['d:/code/berth', 'd:/code/bobcorn'])
    expect(merged[0].sources).toEqual(['current', 'session'])
    expect(merged[0].lastSeenAt).toBe('2026-06-02T00:00:00.000Z')
    expect(merged[0].sessionCount).toBe(4)
  })
})
