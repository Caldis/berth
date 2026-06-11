import * as path from 'path'
import { getMainLog } from '../../log'
import type { Asset, AssetScope } from '@shared/types/asset'
import { dedupePathKey } from '@shared/asset-dedupe'
// conventions 仍直连 (CONVENTION_DISPATCH 与 shallow 是有意分叉, 见 shallow-conventions.ts 注)
import { parseAgentsMd, parseClaudeMd, parseMcpServers } from '../../adapters/claude-code/parsers'
import { parseCodexAgentsMd } from '../../adapters/codex/parsers'
import { claudeSettingsCapabilities } from '../../adapters/claude-code/sources'
import { projectCapabilitySources } from '../agent-capabilities'

export interface DeriveContext {
  /** Config roots of the active project. A file inside one is 'project'-scoped;
   * anywhere else (e.g. ~/.claude, ~/.codex) is 'user'. */
  projectRoots: string[]
}

type ConventionParser = (filePath: string, scope: AssetScope) => Asset
type CapabilityParser = (filePath: string, scope: AssetScope) => Asset[]

// Per-basename dispatch for root-level convention files. AGENTS.md is the one
// cross-agent file, so it emits BOTH adapters' rows (identical dedupeKey) and the
// engine's mergeSharedConventions collapses them — exactly like a deep scan.
const CONVENTION_DISPATCH: Record<string, ConventionParser[]> = {
  'CLAUDE.md': [parseClaudeMd],
  'CLAUDE.local.md': [parseClaudeMd],
  'AGENTS.md': [parseAgentsMd, parseCodexAgentsMd]
}

// GH-115 T9: cap-1 (单文件多资产) 与 cap-2 (glob 类单文件) 两张表从
// engine/agent-capabilities 单源派生 (此前注释自认 Mirrors 且已实际分叉)。
const CAPABILITY_FILE_DISPATCH: { suffix: string; parse: CapabilityParser }[] =
  projectCapabilitySources()
    .filter((rule) => rule.kind === 'file')
    .map((rule) => ({ suffix: rule.file!, parse: rule.parse }))

const CAPABILITY_GLOB_DISPATCH: { dir: string; fileName?: string; ext?: string; parse: ConventionParser }[] =
  projectCapabilitySources()
    .filter((rule) => rule.kind === 'glob')
    .map((rule) => ({
      dir: rule.dir!,
      fileName: rule.fileName,
      ext: rule.ext,
      parse: (f: string, s: Parameters<typeof rule.parse>[1]) => {
        const produced = rule.parse(f, s)
        if (produced.length !== 1) throw new Error(`glob capability rule for ${rule.dir} must yield exactly one asset`)
        return produced[0]
      }
    }))

// Enterprise (managed) capability configs (GH-113 cap-3a): their basename uniquely
// identifies them and their scope is ALWAYS 'enterprise' (not inferScope's
// project/user). managed-settings.json yields the full settings capability set;
// managed-mcp.json yields mcp servers. The watcher only emits these from the real
// managed dir, so a basename key is safe.
const ENTERPRISE_DISPATCH: Record<string, (filePath: string) => Asset[]> = {
  'managed-settings.json': (filePath) => claudeSettingsCapabilities(filePath, 'enterprise'),
  'managed-mcp.json': (filePath) => parseMcpServers(filePath, 'enterprise')
}

/**
 * Re-derive the assets a single changed file produces (GH-113 I1), so a watcher
 * event can replace just that file's assets instead of triggering a full rescan.
 *
 * Returns `null` for file types not yet supported incrementally — the caller then
 * falls back to a full refresh. Returns `[]` for a supported file that is gone or
 * unreadable (deletion). Covers root-level convention files (CLAUDE.md /
 * CLAUDE.local.md / AGENTS.md) and single-file multi-asset capability configs
 * (.mcp.json, .claude/settings*.json, .codex/config.toml, .codex/hooks.json);
 * glob-class capabilities (skills/agents/commands) are handled by later slices.
 */
export function deriveAssetsForPath(filePath: string, ctx: DeriveContext): Asset[] | null {
  // Plugin-bundled files (~/.claude/plugins/{cache,data}/…) get their pluginId/
  // origin tagging only from the full scan's descendPluginComponents; re-deriving
  // them per-file would drop it (e.g. a plugin's .mcp.json matching the cap-1
  // rule → an mcp row without pluginId). Fall back to a full refresh. (cap-3b)
  if (isUnderPluginsDir(filePath)) return null

  const conventionParsers = CONVENTION_DISPATCH[path.basename(filePath)]
  if (conventionParsers) {
    const scope = inferScope(filePath, ctx)
    const assets: Asset[] = []
    for (const parse of conventionParsers) {
      try {
        assets.push(parse(filePath, scope))
      } catch (err) {
        // The file was deleted or is mid-write/unreadable — omit its row. A removed
        // convention file derives to [], which removes its assets from the snapshot.
        getMainLog().log('derive-asset', err)
      }
    }
    return assets
  }

  const enterpriseParser = ENTERPRISE_DISPATCH[path.basename(filePath)]
  if (enterpriseParser) {
    try {
      return enterpriseParser(filePath)
    } catch (err) {
      // A deleted or mid-write managed config derives to [] (removing its assets).
      getMainLog().log('derive-asset', err)
      return []
    }
  }

  const capability = matchCapabilityFile(filePath)
  if (capability) {
    try {
      return capability(filePath, inferScope(filePath, ctx))
    } catch {
      // A deleted or mid-write config derives to [] (removing its assets). The JSON
      // parsers already swallow their own read errors; this guards the rare throw.
      return []
    }
  }

  const globParser = matchCapabilityGlob(filePath)
  if (globParser) {
    try {
      return [globParser(filePath, inferScope(filePath, ctx))]
    } catch {
      // A deleted or mid-write capability file derives to [] (removing its asset).
      return []
    }
  }

  return null
}

/** Match a single-file multi-asset capability config by normalized path suffix
 * (separators unified, case-folded on Windows — mirroring dedupePathKey's policy). */
function matchCapabilityFile(filePath: string): CapabilityParser | null {
  const fileNorm = normalizeForSuffix(filePath)
  for (const entry of CAPABILITY_FILE_DISPATCH) {
    const suffix = normalizeForSuffix(entry.suffix)
    if (fileNorm === suffix || fileNorm.endsWith('/' + suffix)) return entry.parse
  }
  return null
}

/** Match a glob-class capability file (GH-113 cap-2) by capability dir segment +
 * filename / extension, normalized like dedupePathKey. The capability dirs are
 * distinct (skills/agents/commands/...), so a file matches at most one entry. */
function matchCapabilityGlob(filePath: string): ConventionParser | null {
  const fileNorm = normalizeForSuffix(filePath)
  const baseNorm = normalizeForSuffix(path.basename(filePath))
  for (const entry of CAPABILITY_GLOB_DISPATCH) {
    if (!fileNorm.includes('/' + normalizeForSuffix(entry.dir) + '/')) continue
    if (entry.fileName) {
      if (baseNorm === normalizeForSuffix(entry.fileName)) return entry.parse
    } else if (entry.ext && fileNorm.endsWith(entry.ext)) {
      return entry.parse
    }
  }
  return null
}

function normalizeForSuffix(p: string): string {
  const slashed = p.split('\\').join('/')
  return process.platform === 'win32' ? slashed.toLowerCase() : slashed
}

/** A plugin-bundled component file lives under a plugins cache/data dir. The full
 * scan tags those with pluginId/origin, which a per-file re-derive can't
 * reproduce — so they are never derived incrementally. (GH-113 cap-3b) */
function isUnderPluginsDir(filePath: string): boolean {
  const norm = normalizeForSuffix(filePath)
  return norm.includes('/plugins/cache/') || norm.includes('/plugins/data/')
}

/** A file inside one of the active project's config roots is 'project'-scoped;
 * anywhere else it is a user-level file. Compares normalized path keys
 * (dedupePathKey) so the check is case/separator-stable per platform. */
function inferScope(filePath: string, ctx: DeriveContext): AssetScope {
  const fileKey = dedupePathKey(filePath)
  const sep = process.platform === 'win32' ? '\\' : '/'
  for (const root of ctx.projectRoots) {
    const rootKey = dedupePathKey(root)
    if (fileKey === rootKey || fileKey.startsWith(rootKey + sep)) return 'project'
  }
  return 'user'
}
