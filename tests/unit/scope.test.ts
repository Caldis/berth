import { describe, expect, it } from 'vitest'
import {
  assetMatchesProjectPath,
  createProjectScopeCandidate,
  filterAssetsByAppScope,
  mergeProjectScopeCandidates,
  normalizeProjectPath,
  normalizeProjectPathKey,
  normalizeScopeSelection,
  projectPathForScope,
  sameProjectPath
} from '../../src/shared/scope'
import type { Asset, AssetScope, AssetType } from '../../src/shared/types/asset'

function asset(
  id: string,
  scope: AssetScope,
  path: string,
  meta: Record<string, unknown> = {},
  type: AssetType = 'skill'
): Asset {
  return {
    id,
    agentId: 'codex',
    category: type === 'session' ? 'state' : 'instruction',
    type,
    scope,
    name: id,
    path,
    meta
  }
}

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

  it('returns a project path only for project scope', () => {
    expect(projectPathForScope({ mode: 'global' })).toBeUndefined()
    expect(projectPathForScope({ mode: 'user' })).toBeUndefined()
    expect(projectPathForScope({
      mode: 'project',
      projectPath: 'D:/Code/berth',
      projectPathKey: 'd:/code/berth'
    })).toBe('D:/Code/berth')
  })

  it('matches project assets by explicit projectPath or file path containment', () => {
    expect(assetMatchesProjectPath(
      asset('explicit', 'session', 'C:/Users/test/session.jsonl', { projectPath: 'D:/Code/berth' }, 'session'),
      'd:/code/berth/'
    )).toBe(true)
    expect(assetMatchesProjectPath(
      asset('contained', 'project', 'D:/Code/berth/.agents/skills/demo/SKILL.md'),
      'D:/Code/berth'
    )).toBe(true)
    expect(assetMatchesProjectPath(
      asset('other', 'project', 'D:/Code/other/.agents/skills/demo/SKILL.md'),
      'D:/Code/berth'
    )).toBe(false)
  })

  it('filters assets by application scope', () => {
    const assets = [
      asset('enterprise', 'enterprise', 'C:/ProgramData/Claude/managed.json'),
      asset('user', 'user', 'C:/Users/mail/.codex/config.toml'),
      asset('project-match', 'project', 'D:/Code/berth/.codex/config.toml'),
      asset('project-other', 'project', 'D:/Code/other/.codex/config.toml'),
      asset('session-match', 'session', 'C:/Users/mail/.codex/sessions/1.jsonl', { projectPath: 'D:/Code/berth' }, 'session')
    ]

    expect(filterAssetsByAppScope(assets, { mode: 'global' }).map((item) => item.id)).toEqual([
      'enterprise',
      'user',
      'project-match',
      'project-other',
      'session-match'
    ])
    expect(filterAssetsByAppScope(assets, { mode: 'user' }).map((item) => item.id)).toEqual([
      'enterprise',
      'user'
    ])
    expect(filterAssetsByAppScope(assets, {
      mode: 'project',
      projectPath: 'D:/Code/berth',
      projectPathKey: 'd:/code/berth'
    }).map((item) => item.id)).toEqual([
      'enterprise',
      'user',
      'project-match',
      'session-match'
    ])
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
