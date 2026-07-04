import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset } from '@shared/types/asset'
import { projectCapabilitySources, shallowConventionSources } from './agent-capabilities'
import type { AssetFileCache } from './assets/file-cache'
import { getMainLog } from '../log'

/**
 * Shallow-index a NON-active project's root conventions for the global scope, so
 * "global = all device assets" shows every project's AGENTS.md / CLAUDE.md without
 * paying for a full deep scan. Each asset is tagged `meta.scanDepth='shallow'` and
 * `meta.projectPath=<owner>` so scope filtering attributes it to the right project
 * (and a deep rescan replaces it by stable key when that project is selected — T4).
 */
export function scanShallowConventions(projectDir: string, cache?: AssetFileCache<Asset[]>): Asset[] {
  const assets: Asset[] = []
  for (const source of shallowConventionSources()) {
    const filePath = path.join(projectDir, source.file)
    if (!fs.existsSync(filePath)) continue
    try {
      // Cache entries stay depth-neutral (GH-155 C2): the shallow/deep context
      // tags are applied post-cache so both scan depths can share one cache.
      // readByAgentIds stays inside produce — it derives from the source table,
      // not from the scanning context.
      const produce = (): Asset[] => {
        const asset = source.parse(filePath, 'project')
        return [
          source.sharedReaderAgentIds
            ? { ...asset, meta: { ...asset.meta, readByAgentIds: source.sharedReaderAgentIds } }
            : asset
        ]
      }
      const parsed = cache ? cache.getOrParse(filePath, produce) : produce()
      assets.push(...tagProjectScanDepth(parsed, 'shallow', projectDir))
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
      // Depth-neutral cache entries; owner/depth tags post-cache (GH-155 C2).
      const produce = (): Asset[] => parse(file)
      const parsed = cache ? cache.getOrParse(file, produce) : produce()
      out.push(...tagProjectScanDepth(parsed, 'shallow', projectRoot))
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

/** Owner/depth tag applied AFTER cache retrieval (GH-155 C2): cache entries are
 * depth-neutral, so shallow and deep project scans share one AssetFileCache
 * without polluting each other's `scanDepth`. Returns tagged copies. */
export function tagProjectScanDepth(
  assets: Asset[],
  scanDepth: 'shallow' | 'deep',
  projectPath: string
): Asset[] {
  return assets.map((asset) => ({
    ...asset,
    meta: { ...asset.meta, scanDepth, projectPath }
  }))
}
