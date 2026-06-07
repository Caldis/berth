import * as fs from 'fs'
import * as path from 'path'
import type { Asset, AssetScope } from '@shared/types/asset'
import { parseAgentsMd, parseClaudeMd } from '../adapters/claude-code/parsers'

/** Both agents read AGENTS.md, so a shallow-indexed one is visible in either view. */
const SHARED_AGENT_READERS = ['claude-code', 'codex']

interface ShallowConventionSource {
  file: string
  parse: (filePath: string, scope: AssetScope) => Asset
  sharedReaders: boolean
}

// Root-level conventions only — the inexpensive surface that answers "what does
// this project tell its agents". Deliberately excludes the deep nested
// `**/CLAUDE.md` glob and every .claude/.codex capability config (skills, agents,
// commands, hooks, mcp), which only the active project's deep scan reads.
const SHALLOW_SOURCES: ShallowConventionSource[] = [
  { file: 'AGENTS.md', parse: parseAgentsMd, sharedReaders: true },
  { file: path.join('.claude', 'AGENTS.md'), parse: parseAgentsMd, sharedReaders: true },
  { file: 'CLAUDE.md', parse: parseClaudeMd, sharedReaders: false },
  { file: 'CLAUDE.local.md', parse: parseClaudeMd, sharedReaders: false },
  { file: path.join('.claude', 'CLAUDE.md'), parse: parseClaudeMd, sharedReaders: false }
]

/**
 * Shallow-index a NON-active project's root conventions for the global scope, so
 * "global = all device assets" shows every project's AGENTS.md / CLAUDE.md without
 * paying for a full deep scan. Each asset is tagged `meta.scanDepth='shallow'` and
 * `meta.projectPath=<owner>` so scope filtering attributes it to the right project
 * (and a deep rescan replaces it by stable key when that project is selected — T4).
 */
export function scanShallowConventions(projectDir: string): Asset[] {
  const assets: Asset[] = []
  for (const source of SHALLOW_SOURCES) {
    const filePath = path.join(projectDir, source.file)
    if (!fs.existsSync(filePath)) continue
    let asset: Asset
    try {
      asset = source.parse(filePath, 'project')
    } catch {
      // A convention file we cannot read is simply absent from the shallow index.
      continue
    }
    asset.meta = {
      ...asset.meta,
      scanDepth: 'shallow',
      projectPath: projectDir,
      ...(source.sharedReaders ? { readByAgentIds: SHARED_AGENT_READERS } : {})
    }
    assets.push(asset)
  }
  return assets
}
