import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset, AssetScope } from '@shared/types/asset'
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
} from '../adapters/claude-code/parsers'
import {
  parseCodexConfig,
  parseCodexCustomAgent,
  parseCodexHooksJson,
  parseCodexSkill
} from '../adapters/codex/parsers'
import type { AssetFileCache } from './assets/file-cache'

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
export function scanShallowConventions(projectDir: string, cache?: AssetFileCache<Asset[]>): Asset[] {
  const assets: Asset[] = []
  for (const source of SHALLOW_SOURCES) {
    const filePath = path.join(projectDir, source.file)
    if (!fs.existsSync(filePath)) continue
    try {
      const produce = (): Asset[] => {
        const asset = source.parse(filePath, 'project')
        asset.meta = {
          ...asset.meta,
          scanDepth: 'shallow',
          projectPath: projectDir,
          ...(source.sharedReaders ? { readByAgentIds: SHARED_AGENT_READERS } : {})
        }
        return [asset]
      }
      assets.push(...(cache ? cache.getOrParse(filePath, produce) : produce()))
    } catch {
      // A convention file we cannot read is simply absent from the shallow index.
    }
  }
  return assets
}

/** A capability source in a project: either a glob (skills/agents/commands) or a
 * single multi-asset config file (settings.json / config.toml). */
type CapabilityParser = (filePath: string) => Asset[]

const CLAUDE = (p: string): string => path.join('.claude', p)

// Per-project capability surface, mirroring the adapters' project-level scanning
// (claude scanner.ts / codex index.ts) but for a NON-active project — root-level
// only, no deep nested glob, no user-level. Owner-tagged so global shows them and
// project mode filters to the active project. (GH-113 global=all-capabilities)
const CAPABILITY_GLOBS: { dir: string; pattern: string; parse: CapabilityParser }[] = [
  { dir: CLAUDE('skills'), pattern: '**/SKILL.md', parse: (f) => [parseSkill(f, 'project')] },
  { dir: CLAUDE('agents'), pattern: '**/*.md', parse: (f) => [parseAgent(f, 'project')] },
  { dir: CLAUDE('commands'), pattern: '**/*.md', parse: (f) => [parseCommand(f, 'project')] },
  { dir: CLAUDE('output-styles'), pattern: '**/*.md', parse: (f) => [parseOutputMode(f, 'project')] },
  { dir: path.join('.agents', 'skills'), pattern: '**/SKILL.md', parse: (f) => [parseCodexSkill(f, 'project')] },
  { dir: path.join('.codex', 'agents'), pattern: '**/*.toml', parse: (f) => [parseCodexCustomAgent(f, 'project')] }
]

const SETTINGS_PARSER: CapabilityParser = (f) => [
  ...parseMcpServers(f, 'project'),
  ...parseHooks(f, 'project'),
  ...parsePermissions(f, 'project'),
  ...parseEnv(f, 'project'),
  ...parseStatuslinesFromSettings(f, 'project')
]

const CAPABILITY_FILES: { file: string; parse: CapabilityParser }[] = [
  { file: '.mcp.json', parse: (f) => parseMcpServers(f, 'project') },
  { file: CLAUDE('settings.json'), parse: SETTINGS_PARSER },
  { file: CLAUDE('settings.local.json'), parse: SETTINGS_PARSER },
  { file: path.join('.codex', 'config.toml'), parse: (f) => parseCodexConfig(f, 'project') },
  { file: path.join('.codex', 'hooks.json'), parse: (f) => parseCodexHooksJson(f, 'project') }
]

/**
 * Scan a NON-active project's CAPABILITIES (skills/agents/commands/mcp/hooks/...)
 * for the global scope, so "global = all device assets" shows every project's
 * capabilities, not just its conventions. Root-level only (no deep nested glob,
 * no user-level). Each asset is owner-tagged (`meta.projectPath`, `scanDepth`)
 * so the T3a predicate shows it globally and hides it in other projects' scope.
 *
 * `cache` (optional) skips re-parsing files whose fingerprint is unchanged across
 * scans — the cost control for scanning many projects every refresh. (GH-113)
 */
export function scanProjectCapabilities(projectRoot: string, cache?: AssetFileCache<Asset[]>): Asset[] {
  const out: Asset[] = []
  const derive = (file: string, parse: CapabilityParser): void => {
    if (!fs.existsSync(file)) return
    try {
      const produce = (): Asset[] => ownerTag(parse(file), projectRoot)
      out.push(...(cache ? cache.getOrParse(file, produce) : produce()))
    } catch {
      // An unreadable/parse-failing config is simply absent from the index.
    }
  }

  for (const source of CAPABILITY_GLOBS) {
    const dir = path.join(projectRoot, source.dir)
    if (!fs.existsSync(dir)) continue
    let files: string[] = []
    try {
      files = glob.sync(source.pattern, { cwd: dir, absolute: true, windowsPathsNoEscape: true })
    } catch {
      files = []
    }
    for (const file of files) derive(file, source.parse)
  }
  for (const source of CAPABILITY_FILES) derive(path.join(projectRoot, source.file), source.parse)

  return out
}

function ownerTag(assets: Asset[], projectRoot: string): Asset[] {
  return assets.map((asset) => ({
    ...asset,
    meta: { ...asset.meta, scanDepth: 'shallow', projectPath: projectRoot }
  }))
}
