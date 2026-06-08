import * as path from 'path'
import type { Asset, AssetScope } from '@shared/types/asset'
import { dedupePathKey } from '@shared/asset-dedupe'
import {
  parseAgent,
  parseAgentsMd,
  parseClaudeMd,
  parseCommand,
  parseEnv,
  parseHooks,
  parseMcpServers,
  parseOutputMode,
  parsePermissions,
  parseSkill,
  parseStatuslinesFromSettings
} from '../../adapters/claude-code/parsers'
import {
  parseCodexAgentsMd,
  parseCodexConfig,
  parseCodexCustomAgent,
  parseCodexHooksJson,
  parseCodexSkill
} from '../../adapters/codex/parsers'

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

// One settings.json yields several capability assets (mcp/hooks/permission/env/
// statusline); they share the file's sourceKey (cap-0) so applyFileChange replaces
// them as a unit. Mirrors the adapters' project-level scan combination.
const settingsCapabilities: CapabilityParser = (filePath, scope) => [
  ...parseMcpServers(filePath, scope),
  ...parseHooks(filePath, scope),
  ...parsePermissions(filePath, scope),
  ...parseEnv(filePath, scope),
  ...parseStatuslinesFromSettings(filePath, scope)
]

// Single-file, multi-asset capability configs (GH-113 cap-1), matched by normalized
// path suffix — basename alone is ambiguous (settings.json under .claude, config.toml
// under .codex). Glob-class capabilities (skills/agents/commands/output-modes) are
// cap-2; anything unmatched returns null → caller does a full refresh.
const CAPABILITY_FILE_DISPATCH: { suffix: string; parse: CapabilityParser }[] = [
  { suffix: '.mcp.json', parse: (f, s) => parseMcpServers(f, s) },
  { suffix: path.join('.claude', 'settings.json'), parse: settingsCapabilities },
  { suffix: path.join('.claude', 'settings.local.json'), parse: settingsCapabilities },
  { suffix: path.join('.codex', 'config.toml'), parse: (f, s) => parseCodexConfig(f, s) },
  { suffix: path.join('.codex', 'hooks.json'), parse: (f, s) => parseCodexHooksJson(f, s) }
]

// Glob-class capabilities (GH-113 cap-2): a single file under a known capability
// directory, matched by dir segment + filename/extension, each producing ONE
// asset. Mirrors the shallow scan's CAPABILITY_GLOBS but applied per-file.
const CAPABILITY_GLOB_DISPATCH: { dir: string; fileName?: string; ext?: string; parse: ConventionParser }[] = [
  { dir: path.join('.claude', 'skills'), fileName: 'SKILL.md', parse: parseSkill },
  { dir: path.join('.claude', 'agents'), ext: '.md', parse: parseAgent },
  { dir: path.join('.claude', 'commands'), ext: '.md', parse: parseCommand },
  { dir: path.join('.claude', 'output-styles'), ext: '.md', parse: parseOutputMode },
  { dir: path.join('.agents', 'skills'), fileName: 'SKILL.md', parse: parseCodexSkill },
  { dir: path.join('.codex', 'agents'), ext: '.toml', parse: parseCodexCustomAgent }
]

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
  const conventionParsers = CONVENTION_DISPATCH[path.basename(filePath)]
  if (conventionParsers) {
    const scope = inferScope(filePath, ctx)
    const assets: Asset[] = []
    for (const parse of conventionParsers) {
      try {
        assets.push(parse(filePath, scope))
      } catch {
        // The file was deleted or is mid-write/unreadable — omit its row. A removed
        // convention file derives to [], which removes its assets from the snapshot.
      }
    }
    return assets
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
