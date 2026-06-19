import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import ignore from 'ignore'
import {
  loadProjectIgnore,
  loadNestedProjectIgnore,
  buildScanIgnore,
  type GlobPathLike
} from '../src/engine/scan-ignore'

const created: string[] = []
function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-scan-ignore-'))
  created.push(dir)
  return dir
}
function globPath(full: string): GlobPathLike {
  return { fullpath: () => full }
}
afterEach(() => {
  for (const d of created.splice(0)) fs.rmSync(d, { recursive: true, force: true })
})

describe('loadProjectIgnore', () => {
  it('returns null when respectGitignore is off (AC4)', () => {
    const dir = tmpProject()
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n')
    expect(loadProjectIgnore(dir, { respectGitignore: false })).toBeNull()
  })

  it('returns null for a non-git dir with no ignore files (AC6)', () => {
    const dir = tmpProject()
    expect(loadProjectIgnore(dir, { respectGitignore: true })).toBeNull()
  })

  it('returns null when projectDir is undefined', () => {
    expect(loadProjectIgnore(undefined, { respectGitignore: true })).toBeNull()
  })

  it('loads .gitignore rules (AC3)', () => {
    const dir = tmpProject()
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n*.log\n')
    const ig = loadProjectIgnore(dir, { respectGitignore: true })
    expect(ig).not.toBeNull()
    expect(ig!.ignores('node_modules/foo.js')).toBe(true)
    expect(ig!.ignores('app.log')).toBe(true)
    expect(ig!.ignores('src/index.ts')).toBe(false)
  })

  it('merges .berthignore with .gitignore', () => {
    const dir = tmpProject()
    fs.writeFileSync(path.join(dir, '.gitignore'), 'dist/\n')
    fs.writeFileSync(path.join(dir, '.berthignore'), 'vendor/\n')
    const ig = loadProjectIgnore(dir, { respectGitignore: true })!
    expect(ig.ignores('dist/a.js')).toBe(true)
    expect(ig.ignores('vendor/b.js')).toBe(true)
  })
})

describe('loadNestedProjectIgnore (GH-145)', () => {
  function mk(dir: string, file: string, content: string): void {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), content)
  }

  it('returns null when respectGitignore is off', () => {
    const dir = tmpProject()
    mk(dir, '.gitignore', 'node_modules/\n')
    expect(loadNestedProjectIgnore(dir, dir, { respectGitignore: false })).toBeNull()
  })

  it('returns null when no ignore file exists anywhere', () => {
    const dir = tmpProject()
    expect(loadNestedProjectIgnore(dir, dir, { respectGitignore: true })).toBeNull()
  })

  it('returns null when rootDir is undefined', () => {
    expect(loadNestedProjectIgnore(undefined, undefined, { respectGitignore: true })).toBeNull()
  })

  it('adds root rules verbatim (backward compatible with loadProjectIgnore)', () => {
    const dir = tmpProject()
    mk(dir, '.gitignore', 'node_modules/\n*.log\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('node_modules/foo.js')).toBe(true)
    expect(ig.ignores('app.log')).toBe(true)
    expect(ig.ignores('src/index.ts')).toBe(false)
  })

  it('scopes a non-anchored subdirectory rule to its own subtree (any depth)', () => {
    const dir = tmpProject()
    mk(dir, 'sub/.gitignore', 'secret/\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    // Inside sub at any depth → ignored.
    expect(ig.ignores('sub/secret/')).toBe(true)
    expect(ig.ignores('sub/secret/CLAUDE.md')).toBe(true)
    expect(ig.ignores('sub/nested/secret/CLAUDE.md')).toBe(true)
    // Same-named dir outside sub → NOT ignored (rule is scoped).
    expect(ig.ignores('secret/CLAUDE.md')).toBe(false)
    expect(ig.ignores('other/secret/CLAUDE.md')).toBe(false)
  })

  it('merges root and subdirectory rules into one matcher', () => {
    const dir = tmpProject()
    mk(dir, '.gitignore', 'vendor/\n')
    mk(dir, 'pkg/.gitignore', 'tmp/\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('vendor/x.md')).toBe(true) // root rule
    expect(ig.ignores('pkg/tmp/x.md')).toBe(true) // sub rule scoped to pkg
    expect(ig.ignores('tmp/x.md')).toBe(false) // root-level tmp NOT covered by pkg rule
  })

  it('merges a subdirectory .berthignore alongside .gitignore', () => {
    const dir = tmpProject()
    mk(dir, 'sub/.berthignore', 'cache/\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('sub/cache/x.md')).toBe(true)
    expect(ig.ignores('cache/x.md')).toBe(false)
  })

  // --- Supported beyond the pessimistic spec floor: ANCHORED subdir rules ---
  it('relativizes an anchored subdirectory rule (leading slash) to the subtree root', () => {
    const dir = tmpProject()
    mk(dir, 'sub/.gitignore', '/build\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('sub/build')).toBe(true)
    expect(ig.ignores('sub/build/x')).toBe(true)
    // Anchored → only at sub root, NOT deeper.
    expect(ig.ignores('sub/nested/build')).toBe(false)
  })

  it('relativizes an anchored subdirectory rule (middle slash) to the subtree root', () => {
    const dir = tmpProject()
    mk(dir, 'sub/.gitignore', 'build/out\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('sub/build/out')).toBe(true)
    expect(ig.ignores('sub/nested/build/out')).toBe(false)
  })

  it('skips blank and comment lines when relativizing subdirectory rules', () => {
    const dir = tmpProject()
    mk(dir, 'sub/.gitignore', '# a comment\n\nsecret/\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    expect(ig.ignores('sub/secret/x.md')).toBe(true)
  })

  // --- Known limitation: cross-directory negation precedence (asserted, not faked) ---
  it('rewrites a subdirectory negation but cannot reproduce git per-directory precedence', () => {
    const dir = tmpProject()
    // Root ignores all *.md; sub tries to re-include keep.md.
    mk(dir, '.gitignore', '*.md\n')
    mk(dir, 'sub/.gitignore', '!keep.md\n')
    const ig = loadNestedProjectIgnore(dir, dir, { respectGitignore: true })!
    // The negation IS rewritten to a valid form, so for this single-level case
    // the re-include happens to work:
    expect(ig.ignores('sub/keep.md')).toBe(false)
    // ...but this is best-effort: documented as a known limitation because a
    // flattened rule list cannot reproduce git's per-directory last-match-wins in
    // the general (multi-level, conflicting) case. Other *.md stay ignored.
    expect(ig.ignores('sub/other.md')).toBe(true)
    expect(ig.ignores('top.md')).toBe(true)
  })
})

describe('buildScanIgnore', () => {
  it('hits excludePaths by absolute prefix, cwd-independent (AC1)', () => {
    const si = buildScanIgnore({ projectDir: '/proj', excludePaths: ['/proj/skip'] })
    expect(si.ignored(globPath('/proj/skip/file.md'))).toBe(true)
    expect(si.ignored(globPath('/proj/keep/file.md'))).toBe(false)
  })

  it('childrenIgnored prunes excluded directories (AC8)', () => {
    const si = buildScanIgnore({ projectDir: '/proj', excludePaths: ['/proj/skip'] })
    expect(si.childrenIgnored(globPath('/proj/skip'))).toBe(true)
    expect(si.childrenIgnored(globPath('/proj/keep'))).toBe(false)
  })

  it('hits gitignore by relative posix path (AC3)', () => {
    const ig = ignore().add('node_modules/\n*.log\n')
    const si = buildScanIgnore({ projectDir: '/proj', projectIgnore: ig })
    expect(si.ignored(globPath('/proj/node_modules/x.js'))).toBe(true)
    expect(si.ignored(globPath('/proj/debug.log'))).toBe(true)
    expect(si.ignored(globPath('/proj/src/main.ts'))).toBe(false)
  })

  it('childrenIgnored prunes gitignored directories', () => {
    const ig = ignore().add('node_modules/\n')
    const si = buildScanIgnore({ projectDir: '/proj', projectIgnore: ig })
    expect(si.childrenIgnored(globPath('/proj/node_modules'))).toBe(true)
  })

  it('does not match paths outside projectDir', () => {
    const ig = ignore().add('*.log\n')
    const si = buildScanIgnore({ projectDir: '/proj', projectIgnore: ig })
    expect(si.ignored(globPath('/other/a.log'))).toBe(false)
  })

  it('ignores nothing with no excludePaths and no projectIgnore', () => {
    const si = buildScanIgnore({ projectDir: '/proj' })
    expect(si.ignored(globPath('/proj/anything.md'))).toBe(false)
    expect(si.childrenIgnored(globPath('/proj/anything'))).toBe(false)
  })

  it('combines excludePaths and gitignore', () => {
    const ig = ignore().add('*.log\n')
    const si = buildScanIgnore({ projectDir: '/proj', excludePaths: ['/proj/skip'], projectIgnore: ig })
    expect(si.ignored(globPath('/proj/skip/keep.md'))).toBe(true) // excludePaths
    expect(si.ignored(globPath('/proj/a.log'))).toBe(true) // gitignore
    expect(si.ignored(globPath('/proj/src/a.ts'))).toBe(false)
  })

  it('applies defaultPatterns regardless of project ignore (preserves hardcoded skips)', () => {
    const si = buildScanIgnore({ projectDir: '/proj', defaultPatterns: ['node_modules/', 'dist/'] })
    expect(si.ignored(globPath('/proj/node_modules/pkg/CLAUDE.md'))).toBe(true)
    expect(si.childrenIgnored(globPath('/proj/dist'))).toBe(true)
    expect(si.ignored(globPath('/proj/src/CLAUDE.md'))).toBe(false)
  })

  it('combines defaultPatterns, excludePaths, and gitignore', () => {
    const ig = ignore().add('*.local.md\n')
    const si = buildScanIgnore({
      projectDir: '/proj',
      excludePaths: ['/proj/vendor'],
      projectIgnore: ig,
      defaultPatterns: ['node_modules/']
    })
    expect(si.ignored(globPath('/proj/node_modules/x/CLAUDE.md'))).toBe(true) // default
    expect(si.ignored(globPath('/proj/vendor/CLAUDE.md'))).toBe(true) // excludePaths
    expect(si.ignored(globPath('/proj/notes.local.md'))).toBe(true) // gitignore
    expect(si.ignored(globPath('/proj/src/CLAUDE.md'))).toBe(false)
  })
})
