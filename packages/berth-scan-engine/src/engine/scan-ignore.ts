import * as fs from 'fs'
import * as path from 'path'
import ignore, { isPathValid, type Ignore } from 'ignore'
import { isPathInside } from '@shared/path-utils'

// GH-142: scan-time exclusion lowered to the glob enumeration layer so excluded /
// gitignored subtrees are skipped during traversal (saves readdir + parse), instead
// of `filterExcludedPaths` dropping already-parsed assets after the fact.

/** Minimal shape of glob@11's Path object passed to IgnoreLike callbacks. */
export interface GlobPathLike {
  fullpath(): string
}

/** glob@11 `ignore` option object: `ignored` drops matches, `childrenIgnored`
 * prunes directory traversal (no readdir into the subtree). */
export interface ScanIgnoreLike {
  ignored(p: GlobPathLike): boolean
  childrenIgnored(p: GlobPathLike): boolean
}

/**
 * Load project-level `.gitignore` + `.berthignore` into a single matcher.
 * Returns null when respectGitignore is off (AC4) or no ignore file exists —
 * non-git scan roots like `~/.claude` stay unaffected (AC6).
 */
export function loadProjectIgnore(
  projectDir: string | undefined,
  opts: { respectGitignore: boolean | undefined }
): Ignore | null {
  if (!opts.respectGitignore || !projectDir) return null
  const ig = ignore()
  let hasRule = false
  // .berthignore after .gitignore so a project can override git rules for berth.
  for (const file of ['.gitignore', '.berthignore']) {
    try {
      ig.add(fs.readFileSync(path.join(projectDir, file), 'utf-8'))
      hasRule = true
    } catch {
      // missing/unreadable ignore file — skip this source.
    }
  }
  return hasRule ? ig : null
}

/**
 * Build a glob IgnoreLike combining excludePaths (absolute path prefix, cwd-
 * independent — D6 backward compat) with the project gitignore matcher
 * (relative + posix, per node-ignore's contract — D2).
 */
export function buildScanIgnore(params: {
  projectDir: string
  excludePaths?: string[]
  projectIgnore?: Ignore | null
  /** Always-ignored gitignore-style patterns (e.g. vendored/build dirs) applied
   * regardless of respectGitignore — preserves the nested-glob hardcoded skips. */
  defaultPatterns?: string[]
}): ScanIgnoreLike {
  const { projectDir, excludePaths, projectIgnore, defaultPatterns } = params
  const baseIgnore =
    defaultPatterns && defaultPatterns.length ? ignore().add(defaultPatterns) : null

  const excludeHit = (full: string): boolean =>
    !!excludePaths?.some((ex) => isPathInside(full, ex, { includeEqual: true }))

  // node-ignore needs a relative posix path; querying both `rel` and `rel/`
  // covers file rules and directory rules (`node_modules/`) alike.
  const matcherHit = (ig: Ignore, full: string): boolean => {
    let rel = path.relative(projectDir, full)
    if (!rel || rel.startsWith('..')) return false
    rel = rel.split(path.sep).join('/')
    const asDir = rel.endsWith('/') ? rel : rel + '/'
    return (isPathValid(rel) && ig.ignores(rel)) || (isPathValid(asDir) && ig.ignores(asDir))
  }

  const hit = (p: GlobPathLike): boolean => {
    const full = p.fullpath()
    if (excludeHit(full)) return true
    if (baseIgnore && matcherHit(baseIgnore, full)) return true
    if (projectIgnore && matcherHit(projectIgnore, full)) return true
    return false
  }

  return { ignored: hit, childrenIgnored: hit }
}
