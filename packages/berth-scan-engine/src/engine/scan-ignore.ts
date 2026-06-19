import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
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

// GH-145: a project subtree may carry its own `.gitignore` (e.g. `vendor/.gitignore`)
// whose rules are written relative to that subdirectory. `loadProjectIgnore` only
// reads the root, so a nested rule like `sub/.gitignore: secret/` was ignored.
// `loadNestedProjectIgnore` discovers every ignore file in the project subtree,
// reads each, and rewrites each subdirectory rule into a root-relative pattern so a
// single Ignore (queried at the projectDir root by buildScanIgnore) reproduces git's
// per-directory scoping for the common cases.
//
// Known limitations (gitignore semantics that a single flattened matcher cannot
// fully reproduce — asserted explicitly in tests, not faked):
//  - Cross-directory negation precedence: a `!unignore` rule is rewritten to a
//    valid negation, but git evaluates negations per-directory with last-match-wins
//    within each `.gitignore`; merged into one rule list the ordering can differ
//    when a parent and a deeper child re-(un)ignore the same path.
//  - Patterns are scoped to a subtree but git's "a parent cannot re-include a file
//    inside an excluded directory" subtlety is not modeled.

const RELATIVIZE_SOURCES = ['.gitignore', '.berthignore'] as const

/** Rewrite one gitignore rule line authored in `subPosix` (a posix, root-relative
 * directory path) so it matches the same files when queried with root-relative
 * paths. Returns null for blank / comment lines (nothing to scope). */
function relativizeRule(rawLine: string, subPosix: string): string | null {
  const line = rawLine.replace(/\r$/, '')
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  let body = line
  let negate = ''
  if (body.startsWith('!')) {
    negate = '!'
    body = body.slice(1)
  }

  // A gitignore pattern is "anchored" to its directory when it contains a slash
  // anywhere except a single trailing one; otherwise it matches at any depth.
  let anchored = false
  if (body.startsWith('/')) {
    anchored = true
    body = body.slice(1)
  } else {
    const core = body.endsWith('/') ? body.slice(0, -1) : body
    if (core.includes('/')) anchored = true
  }

  // Anchored → pin to the subtree root (`sub/body`). Non-anchored → preserve
  // any-depth matching scoped under the subtree (`sub/**/body`).
  const prefix = anchored ? `${subPosix}/` : `${subPosix}/**/`
  return `${negate}${prefix}${body}`
}

/** Vendored / build directories never worth descending for nested ignore files;
 * mirrors the scanner's NESTED_CONVENTION_IGNORE so discovery does not read the
 * thousands of `.gitignore` files shipped inside dependencies. */
const NESTED_IGNORE_PRUNE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**', '**/build/**', '**/.next/**']

/** Posix directory path of `file` relative to `rootDir` ('' when at root). */
function subPosixOf(rootDir: string, file: string): string {
  const relDir = path.relative(rootDir, path.dirname(file))
  return relDir ? relDir.split(path.sep).join('/') : ''
}

/**
 * Load `.gitignore` + `.berthignore` across the project subtree rooted at
 * `rootDir`, merged into one root-relative Ignore that `buildScanIgnore` queries
 * with paths relative to `rootDir`. Root-level rules are added verbatim (identical
 * to {@link loadProjectIgnore} — backward compatible); each subdirectory's rules
 * are relativized via {@link relativizeRule} so they only scope their own subtree.
 *
 * `leafDir` documents the deepest directory the caller intends to query (the
 * scanner passes `rootDir` itself to request the whole project tree). It does not
 * narrow discovery — the single matcher serves every globbed path, so all ignore
 * files in the subtree are merged regardless. Returns null when respectGitignore
 * is off or no ignore file exists anywhere in the subtree.
 */
export function loadNestedProjectIgnore(
  rootDir: string | undefined,
  _leafDir: string | undefined,
  opts: { respectGitignore: boolean | undefined }
): Ignore | null {
  if (!opts.respectGitignore || !rootDir) return null

  // Discover ignore files root-first so root rules precede deeper overrides
  // (matches git's per-directory precedence within the flattened rule list).
  let files: string[]
  try {
    files = glob
      .sync(`**/{${RELATIVIZE_SOURCES.join(',')}}`, {
        cwd: rootDir,
        absolute: true,
        dot: true,
        windowsPathsNoEscape: true,
        ignore: NESTED_IGNORE_PRUNE
      })
      .sort((a, b) => a.length - b.length) // shallow (root) first
  } catch {
    files = []
  }

  const ig = ignore()
  let hasRule = false
  for (const file of files) {
    let content: string
    try {
      content = fs.readFileSync(file, 'utf-8')
    } catch {
      continue // raced deletion / unreadable — skip this source.
    }
    const subPosix = subPosixOf(rootDir, file)
    if (!subPosix) {
      // Root level: add verbatim so existing single-root behavior is unchanged.
      ig.add(content)
      hasRule = true
      continue
    }
    for (const rawLine of content.split(/\r?\n/)) {
      const rewritten = relativizeRule(rawLine, subPosix)
      if (rewritten) {
        ig.add(rewritten)
        hasRule = true
      }
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
