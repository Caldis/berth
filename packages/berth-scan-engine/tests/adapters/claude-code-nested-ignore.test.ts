import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { scanInstructions, type ScanContext } from '../../src/adapters/claude-code/scanner'

// GH-142: real-fs integration — nested CLAUDE.md recursion must skip excluded /
// gitignored / vendored subtrees at the glob enumeration layer (not post-parse).

const created: string[] = []
function tmpProject(): string {
  // realpath so glob's absolute paths match (macOS /var → /private/var symlink).
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'berth-nested-')))
  created.push(dir)
  return dir
}
function writeClaude(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '# CLAUDE\nproject convention\n')
}
function ctxFor(proj: string, opts: Partial<ScanContext> = {}): ScanContext {
  const emptyHome = tmpProject()
  return {
    claudeDir: path.join(emptyHome, '.claude'), // non-existent → no user-scope scan
    projectDir: proj,
    projectDirs: [proj],
    errors: [],
    ...opts
  }
}
function claudePaths(assets: { path: string }[]): string[] {
  return assets.filter((a) => path.basename(a.path) === 'CLAUDE.md').map((a) => a.path)
}
afterEach(() => {
  for (const d of created.splice(0)) fs.rmSync(d, { recursive: true, force: true })
})

describe('claude-code nested CLAUDE.md enumeration ignores (GH-142)', () => {
  it('skips node_modules/dist via default patterns even without gitignore', () => {
    const proj = tmpProject()
    writeClaude(path.join(proj, 'CLAUDE.md'))
    writeClaude(path.join(proj, 'src', 'CLAUDE.md'))
    writeClaude(path.join(proj, 'node_modules', 'pkg', 'CLAUDE.md'))
    writeClaude(path.join(proj, 'dist', 'CLAUDE.md'))
    const paths = claudePaths(scanInstructions(ctxFor(proj)))
    expect(paths).toContain(path.join(proj, 'src', 'CLAUDE.md'))
    expect(paths.some((p) => p.includes(`${path.sep}node_modules${path.sep}`))).toBe(false)
    expect(paths.some((p) => p.includes(`${path.sep}dist${path.sep}`))).toBe(false)
  })

  it('respects project .gitignore when respectGitignore=true', () => {
    const proj = tmpProject()
    fs.writeFileSync(path.join(proj, '.gitignore'), 'vendor/\n')
    writeClaude(path.join(proj, 'CLAUDE.md'))
    writeClaude(path.join(proj, 'vendor', 'CLAUDE.md'))
    const paths = claudePaths(scanInstructions(ctxFor(proj, { respectGitignore: true })))
    expect(paths).toContain(path.join(proj, 'CLAUDE.md'))
    expect(paths.some((p) => p.includes(`${path.sep}vendor${path.sep}`))).toBe(false)
  })

  it('does NOT read .gitignore when respectGitignore is off', () => {
    const proj = tmpProject()
    fs.writeFileSync(path.join(proj, '.gitignore'), 'vendor/\n')
    writeClaude(path.join(proj, 'vendor', 'CLAUDE.md'))
    const paths = claudePaths(scanInstructions(ctxFor(proj, { respectGitignore: false })))
    expect(paths.some((p) => p.includes(`${path.sep}vendor${path.sep}`))).toBe(true)
  })

  it('honors excludePaths (absolute prefix) during enumeration', () => {
    const proj = tmpProject()
    writeClaude(path.join(proj, 'CLAUDE.md'))
    writeClaude(path.join(proj, 'skipme', 'CLAUDE.md'))
    const paths = claudePaths(scanInstructions(ctxFor(proj, { excludePaths: [path.join(proj, 'skipme')] })))
    expect(paths).toContain(path.join(proj, 'CLAUDE.md'))
    expect(paths.some((p) => p.includes(`${path.sep}skipme${path.sep}`))).toBe(false)
  })
})
