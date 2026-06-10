import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset, AssetScope } from '@shared/types/asset'
// conventions (CLAUDE.md/AGENTS.md) 仍直连两个 parser — 与 derive 的 CONVENTION_DISPATCH
// 是有意的表示模型分叉 (shallow: 单资产+readByAgentIds; derive: 双 agent 双资产), 不并入
// capability 单源表; 收敛讨论归 engine-shared-core-package issue。
import { parseAgentsMd, parseClaudeMd } from '../adapters/claude-code/parsers'
import { projectCapabilitySources } from './agent-capabilities'
import type { AssetFileCache } from './assets/file-cache'
import { getMainLog } from '../log'

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
    } catch (err) {
      // A convention file we cannot read is simply absent from the shallow index.
      getMainLog().log('shallow-conventions', err)
    }
  }
  return assets
}

/** A capability source in a project: either a glob (skills/agents/commands) or a
 * single multi-asset config file (settings.json / config.toml). */
type CapabilityParser = (filePath: string) => Asset[]

// GH-115 T9: 项目级 capability 面从 engine/agent-capabilities 单源派生 (shallow 恒
// scope='project'), 不再本地维护 mirror 表。
const CAPABILITY_GLOBS: { dir: string; pattern: string; parse: CapabilityParser }[] =
  projectCapabilitySources()
    .filter((rule) => rule.kind === 'glob')
    .map((rule) => ({ dir: rule.dir!, pattern: rule.pattern!, parse: (f: string) => rule.parse(f, 'project') }))

const CAPABILITY_FILES: { file: string; parse: CapabilityParser }[] =
  projectCapabilitySources()
    .filter((rule) => rule.kind === 'file')
    .map((rule) => ({ file: rule.file!, parse: (f: string) => rule.parse(f, 'project') }))

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
    } catch (err) {
      // An unreadable/parse-failing config is simply absent from the index.
      getMainLog().log('shallow-capabilities', err)
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
