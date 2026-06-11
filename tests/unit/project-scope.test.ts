import { describe, expect, it } from 'vitest'
import type { Asset } from '@shared/types/asset'
import {
  assetMatchesProjectPath,
  filterAssetsByProjectPath,
  projectScopeCandidatesFromAssets
} from '@berth/scan-engine/project-scope'

function sessionAsset(id: string, projectPath: string, extra: Record<string, unknown> = {}): Asset {
  return {
    id,
    agentId: 'codex',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: id,
    path: `C:\\Users\\test\\.codex\\sessions\\${id}.jsonl`,
    meta: {
      project: projectPath.split(/[\\/]/).filter(Boolean).at(-1),
      projectPath,
      ...extra
    }
  }
}

describe('main project scope helpers', () => {
  it('matches assets by exact normalized project path', () => {
    const asset = sessionAsset('a', 'D:\\Code\\berth')

    expect(assetMatchesProjectPath(asset, 'd:/code/berth/')).toBe(true)
    expect(assetMatchesProjectPath(asset, 'D:\\Code\\bobcorn')).toBe(false)
  })

  it('filters assets by project path without fuzzy project name matching', () => {
    const berth = sessionAsset('berth', 'D:\\Code\\berth')
    const berthClone = sessionAsset('berth-clone', 'D:\\Code\\berth-clone')

    expect(filterAssetsByProjectPath([berth, berthClone], 'D:\\Code\\berth').map((asset) => asset.id)).toEqual(['berth'])
  })

  it('builds deduped project candidates from current project and sessions', () => {
    const candidates = projectScopeCandidatesFromAssets(
      [
        sessionAsset('older', 'D:\\Code\\berth', { startedAt: '2026-06-01T00:00:00.000Z' }),
        sessionAsset('newer', 'd:/code/berth/', { endedAt: '2026-06-02T00:00:00.000Z' }),
        sessionAsset('other', 'D:\\Code\\bobcorn')
      ],
      'D:\\Code\\berth'
    )

    expect(candidates.map((candidate) => candidate.pathKey)).toEqual(['d:/code/berth', 'd:/code/bobcorn'])
    expect(candidates[0]).toMatchObject({
      name: 'berth',
      sources: ['current', 'session'],
      sessionCount: 2,
      lastSeenAt: '2026-06-02T00:00:00.000Z'
    })
  })
})
