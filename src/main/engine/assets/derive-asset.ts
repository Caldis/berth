import * as path from 'path'
import type { Asset, AssetScope } from '@shared/types/asset'
import { dedupePathKey } from '@shared/asset-dedupe'
import { parseAgentsMd, parseClaudeMd } from '../../adapters/claude-code/parsers'
import { parseCodexAgentsMd } from '../../adapters/codex/parsers'

export interface DeriveContext {
  /** Config roots of the active project. A convention file inside one is
   * 'project'-scoped; anywhere else (e.g. ~/.claude) is 'user'. */
  projectRoots: string[]
}

type ConventionParser = (filePath: string, scope: AssetScope) => Asset

// Per-basename dispatch for root-level convention files. AGENTS.md is the one
// cross-agent file, so it emits BOTH adapters' rows (identical dedupeKey) and the
// engine's mergeSharedConventions collapses them — exactly like a deep scan.
const CONVENTION_DISPATCH: Record<string, ConventionParser[]> = {
  'CLAUDE.md': [parseClaudeMd],
  'CLAUDE.local.md': [parseClaudeMd],
  'AGENTS.md': [parseAgentsMd, parseCodexAgentsMd]
}

/**
 * Re-derive the assets a single changed file produces (GH-113 I1), so a watcher
 * event can replace just that file's assets instead of triggering a full rescan.
 *
 * Returns `null` for file types not yet supported incrementally — the caller then
 * falls back to a full refresh. Returns `[]` for a supported file that is gone or
 * unreadable (deletion). Currently covers root-level convention files (CLAUDE.md /
 * CLAUDE.local.md / AGENTS.md); capability files (skills, settings, ...) are
 * handled by later slices.
 */
export function deriveAssetsForPath(filePath: string, ctx: DeriveContext): Asset[] | null {
  const parsers = CONVENTION_DISPATCH[path.basename(filePath)]
  if (!parsers) return null
  const scope = inferScope(filePath, ctx)
  const assets: Asset[] = []
  for (const parse of parsers) {
    try {
      assets.push(parse(filePath, scope))
    } catch {
      // The file was deleted or is mid-write/unreadable — omit its row. A removed
      // convention file derives to [], which removes its assets from the snapshot.
    }
  }
  return assets
}

/** A convention file inside one of the active project's config roots is
 * 'project'-scoped; anywhere else it is a user-level file. Compares normalized
 * path keys (dedupePathKey) so the check is case/separator-stable per platform. */
function inferScope(filePath: string, ctx: DeriveContext): AssetScope {
  const fileKey = dedupePathKey(filePath)
  const sep = process.platform === 'win32' ? '\\' : '/'
  for (const root of ctx.projectRoots) {
    const rootKey = dedupePathKey(root)
    if (fileKey === rootKey || fileKey.startsWith(rootKey + sep)) return 'project'
  }
  return 'user'
}
