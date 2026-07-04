import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Asset } from '@shared/types/asset'
import type { ScanError } from '@shared/types/ipc'
import { isPathInside } from '@shared/path-utils'
import { resolveProjectConfigRoots } from '../project-config-roots'
import { buildScanIgnore, loadNestedProjectIgnore } from './scan-ignore'
import {
  projectCapabilitySources,
  projectConventionDerivers,
  shallowConventionSources
} from './agent-capabilities'
import type { AssetFileCache } from './assets/file-cache'
import { tagProjectScanDepth } from './shallow-conventions'

export interface ScanProjectDeepOptions {
  excludePaths?: string[]
  respectGitignore?: boolean
}

export interface ProjectDeepScanResult {
  assets: Asset[]
  errors: ScanError[]
}

/** Mirrors adapters/claude-code/scanner.ts NESTED_CONVENTION_IGNORE — vendored /
 * build dirs never worth descending for nested conventions. */
const NESTED_CONVENTION_IGNORE = ['node_modules/', '.git/', 'dist/', 'out/', 'build/', '.next/']

/**
 * Deep-index one NON-active project for the global scope (GH-155): everything the
 * shallow pair (scanShallowConventions + scanProjectCapabilities) covers, plus the
 * deep-only delta of the active-project scan — the config-root chain from the
 * repository root down to `projectDir` (a session cwd may be a monorepo subdir)
 * and nested `**\/CLAUDE.md` conventions across the tree (ignore-aware, matching
 * adapters/claude-code/scanner.ts). Runs in the scan helper for production.
 *
 * Every asset is owner-tagged `meta.scanDepth='deep'` + `meta.projectPath=<root>`
 * AFTER cache retrieval — cache entries stay depth-neutral so shallow and deep
 * scans can share one AssetFileCache without tag pollution (SPEC C2). Entity ids
 * are the parsers' deterministic ids, so a shallow→deep row replacement by
 * sourceKey never churns ids (A7).
 */
export function scanProjectDeep(
  projectDir: string,
  cache?: AssetFileCache<Asset[]>,
  options: ScanProjectDeepOptions = {}
): ProjectDeepScanResult {
  const roots = resolveProjectConfigRoots(projectDir)
  if (roots.length === 0) return { assets: [], errors: [] }
  const owner = roots[0]
  const assets: Asset[] = []
  const errors: ScanError[] = []
  const seen = new Set<string>()

  const excluded = (filePath: string): boolean =>
    !!options.excludePaths?.some((ex) => isPathInside(filePath, ex, { includeEqual: true }))

  const collect = (filePath: string, type: string, produce: () => Asset[]): void => {
    const key = filePath.toLowerCase()
    if (seen.has(key) || excluded(filePath)) return
    seen.add(key)
    try {
      const parsed = cache ? cache.getOrParse(filePath, produce) : produce()
      assets.push(...tagProjectScanDepth(parsed, 'deep', owner))
    } catch (err) {
      errors.push({
        path: filePath,
        type,
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // Root-to-leaf config-root chain: conventions + capabilities at every root the
  // active-project deep scan would visit for the same cwd (ScanContext.projectDirs).
  for (const root of roots) {
    for (const source of shallowConventionSources()) {
      const filePath = path.join(root, source.file)
      if (!fs.existsSync(filePath)) continue
      collect(filePath, path.basename(filePath), () => {
        const asset = source.parse(filePath, 'project')
        return [
          source.sharedReaderAgentIds
            ? { ...asset, meta: { ...asset.meta, readByAgentIds: source.sharedReaderAgentIds } }
            : asset
        ]
      })
    }
    for (const rule of projectCapabilitySources()) {
      if (rule.kind === 'glob') {
        const dir = path.join(root, rule.dir!)
        if (!fs.existsSync(dir)) continue
        let files: string[] = []
        try {
          files = glob.sync(rule.pattern!, { cwd: dir, absolute: true, windowsPathsNoEscape: true })
        } catch {
          files = []
        }
        for (const file of files) {
          collect(file, rule.fileName ?? rule.pattern ?? 'capability', () => rule.parse(file, 'project'))
        }
      } else {
        const file = path.join(root, rule.file!)
        if (!fs.existsSync(file)) continue
        collect(file, path.basename(file), () => rule.parse(file, 'project'))
      }
    }
  }

  // Nested subtree CLAUDE.md under the repository root (ignore-aware). Root-level
  // files are already collected above — `seen` dedupes them.
  const nestedParsers = projectConventionDerivers()['CLAUDE.md'] ?? []
  let nested: string[] = []
  try {
    nested = glob.sync('**/CLAUDE.md', {
      cwd: owner,
      absolute: true,
      windowsPathsNoEscape: true,
      ignore: buildScanIgnore({
        projectDir: owner,
        excludePaths: options.excludePaths,
        projectIgnore: loadNestedProjectIgnore(owner, owner, {
          respectGitignore: options.respectGitignore
        }),
        defaultPatterns: NESTED_CONVENTION_IGNORE
      })
    })
  } catch (err) {
    errors.push({
      path: owner,
      type: 'glob',
      message: err instanceof Error ? err.message : String(err)
    })
  }
  for (const filePath of nested) {
    collect(filePath, 'CLAUDE.md', () => nestedParsers.map((parse) => parse(filePath, 'project')))
  }

  return { assets, errors }
}
