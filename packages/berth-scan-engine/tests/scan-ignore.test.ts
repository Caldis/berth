import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import ignore from 'ignore'
import { loadProjectIgnore, buildScanIgnore, type GlobPathLike } from '../src/engine/scan-ignore'

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
})
