import { describe, expect, it } from 'vitest'
import { buildSessionProjectGroups } from '../../src/renderer/src/lib/session-location-groups'
import { normalizeTokenUsage } from '../../src/shared/token-usage'
import type { SessionSummary } from '../../src/shared/types/asset'

const labels = {
  root: 'Root /',
  unknown: 'Unknown'
}

function session(id: string, projectPath: string, startedAt: string, project = 'berth'): SessionSummary {
  return {
    id,
    agentId: 'claude-code',
    title: id,
    project,
    projectPath,
    transcriptPath: `/tmp/${id}.jsonl`,
    startedAt,
    endedAt: null,
    duration: null,
    cost: null,
    tokens: 0,
    tokenUsage: normalizeTokenUsage({ totalTokens: 0 }),
    model: '',
    skillsUsed: [],
    mcpServers: [],
    hooksFired: 0
  }
}

describe('buildSessionProjectGroups', () => {
  it('keeps the root directory at the top', () => {
    const groups = buildSessionProjectGroups(
      [
        session('project-session', '/Users/caldis/Desktop/Code/berth', '2026-06-04T10:00:00.000Z'),
        session('root-session', '/', '2026-05-01T10:00:00.000Z')
      ],
      { labels }
    )

    expect(groups[0]).toMatchObject({
      id: 'project-root:/',
      label: 'Root /',
      count: 1,
      meta: expect.objectContaining({ kind: 'root', pathTitle: '/' })
    })
  })

  it('groups by project name and carries parent directory metadata', () => {
    const groups = buildSessionProjectGroups(
      [
        session('berth', '/Users/caldis/Desktop/Code/berth', '2026-06-04T10:00:00.000Z'),
        session('agentic', '/Users/caldis/Desktop/Code/agentic', '2026-06-04T09:00:00.000Z')
      ],
      { labels }
    )

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      id: 'project-path:/Users/caldis/Desktop/Code/berth',
      label: 'berth',
      count: 1,
      meta: expect.objectContaining({
        kind: 'project',
        pathTitle: '/Users/caldis/Desktop/Code/berth',
        parentPath: '/Users/caldis/Desktop/Code',
        parentLabel: 'Desktop/Code'
      })
    })
    expect(groups[1]).toMatchObject({
      id: 'project-path:/Users/caldis/Desktop/Code/agentic',
      label: 'agentic',
      count: 1,
      meta: expect.objectContaining({
        parentPath: '/Users/caldis/Desktop/Code',
        parentLabel: 'Desktop/Code'
      })
    })
  })

  it('orders the current project parent before other parent directories', () => {
    const groups = buildSessionProjectGroups(
      [
        session('archive', '/Users/caldis/Desktop/Archive/old', '2026-06-04T11:00:00.000Z'),
        session('berth', '/Users/caldis/Desktop/Code/berth', '2026-06-03T11:00:00.000Z')
      ],
      {
        labels,
        currentProjectPath: '/Users/caldis/Desktop/Code/berth'
      }
    )

    expect(groups.map((group) => group.label)).toEqual(['berth', 'old'])
    expect(groups[0].meta).toMatchObject({
      kind: 'current-project',
      parentLabel: 'Desktop/Code'
    })
    expect(groups[1].meta).toMatchObject({ parentLabel: 'Desktop/Archive' })
  })

  it('places unknown project data after path-backed groups', () => {
    const groups = buildSessionProjectGroups(
      [
        session('unknown', '', '2026-06-04T12:00:00.000Z', ''),
        session('root', '/', '2026-06-04T11:00:00.000Z')
      ],
      { labels }
    )

    expect(groups.map((group) => group.id)).toEqual(['project-root:/', 'project-unknown'])
    expect(groups[1]).toMatchObject({
      label: 'Unknown',
      meta: expect.objectContaining({ kind: 'unknown' })
    })
  })

  it('normalizes Windows paths before parent grouping', () => {
    const groups = buildSessionProjectGroups(
      [
        session('windows-a', 'D:\\Code\\berth', '2026-06-04T09:00:00.000Z'),
        session('windows-b', 'D:/Code/agentic', '2026-06-04T08:00:00.000Z')
      ],
      { labels }
    )

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      id: 'project-path:D:/Code/berth',
      label: 'berth',
      count: 1,
      meta: expect.objectContaining({
        pathTitle: 'D:/Code/berth',
        parentPath: 'D:/Code',
        parentLabel: 'D:/Code'
      })
    })
    expect(groups[1]).toMatchObject({
      id: 'project-path:D:/Code/agentic',
      label: 'agentic',
      count: 1,
      meta: expect.objectContaining({
        pathTitle: 'D:/Code/agentic',
        parentPath: 'D:/Code',
        parentLabel: 'D:/Code'
      })
    })
  })
})
