import { describe, it, expect, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { scanProjectDeep } from '../src/engine/project-deep-scan'
import { scanShallowConventions, scanProjectCapabilities } from '../src/engine/shallow-conventions'
import { AssetFileCache } from '../src/engine/assets/file-cache'
import type { Asset } from '@shared/types/asset'

const created: string[] = []
afterEach(() => {
  for (const d of created.splice(0)) fs.rmSync(d, { recursive: true, force: true })
})

function write(root: string, rel: string, content: string): string {
  const fp = path.join(root, ...rel.split('/'))
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, content)
  return fp
}

/** Monorepo fixture: root conventions + root skills, a nested package with its own
 * CLAUDE.md and .claude/skills, plus vendored/gitignored decoys. */
function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-deep-scan-'))
  created.push(dir)
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true })
  write(dir, 'AGENTS.md', '# root agents')
  write(dir, 'CLAUDE.md', '# root claude')
  write(dir, '.claude/skills/root-skill/SKILL.md', '---\nname: root-skill\ndescription: r\n---\nbody')
  write(dir, 'packages/a/CLAUDE.md', '# nested claude')
  write(dir, 'packages/a/.claude/skills/nested-skill/SKILL.md', '---\nname: nested-skill\ndescription: n\n---\nbody')
  write(dir, 'node_modules/dep/CLAUDE.md', '# vendored')
  write(dir, 'ignored-dir/CLAUDE.md', '# gitignored')
  write(dir, '.gitignore', 'ignored-dir/\n')
  return dir
}

const byPath = (assets: Asset[], suffix: string): Asset[] =>
  assets.filter((a) => a.path.split(path.sep).join('/').endsWith(suffix))

describe('scanProjectDeep', () => {
  it('covers the deep delta: nested CLAUDE.md + intermediate config-root capabilities (A1)', () => {
    const repo = makeRepo()
    const leaf = path.join(repo, 'packages', 'a')
    const { assets, errors } = scanProjectDeep(leaf)

    // Deep-only surface: nested convention + nested package's skills.
    expect(byPath(assets, 'packages/a/CLAUDE.md')).toHaveLength(1)
    expect(byPath(assets, 'nested-skill/SKILL.md')).toHaveLength(1)
    // Root surface still covered (shallow parity).
    expect(byPath(assets, 'root-skill/SKILL.md')).toHaveLength(1)
    expect(byPath(assets, '/AGENTS.md').length + byPath(assets, '\\AGENTS.md').length).toBeGreaterThanOrEqual(1)
    expect(errors).toEqual([])

    // Contrast pin: the shallow pair misses exactly this delta.
    const shallow = [...scanShallowConventions(repo), ...scanProjectCapabilities(repo)]
    expect(byPath(shallow, 'packages/a/CLAUDE.md')).toHaveLength(0)
    expect(byPath(shallow, 'nested-skill/SKILL.md')).toHaveLength(0)
  })

  it('tags every asset deep + owner root + sourceKey; root CLAUDE.md not duplicated by the nested glob (A1/A7)', () => {
    const repo = makeRepo()
    const { assets } = scanProjectDeep(path.join(repo, 'packages', 'a'))
    expect(assets.length).toBeGreaterThan(0)
    for (const asset of assets) {
      expect(asset.meta.scanDepth).toBe('deep')
      expect(asset.meta.projectPath).toBe(repo)
      expect(typeof asset.meta.sourceKey).toBe('string')
    }
    expect(byPath(assets, 'CLAUDE.md').filter((a) => path.dirname(a.path) === repo)).toHaveLength(1)
  })

  it('skips vendored dirs always; gitignored dirs only with respectGitignore; excludePaths prune (A11)', () => {
    const repo = makeRepo()
    const off = scanProjectDeep(repo, undefined, { respectGitignore: false })
    expect(byPath(off.assets, 'node_modules/dep/CLAUDE.md')).toHaveLength(0)
    expect(byPath(off.assets, 'ignored-dir/CLAUDE.md')).toHaveLength(1)

    const on = scanProjectDeep(repo, undefined, { respectGitignore: true })
    expect(byPath(on.assets, 'ignored-dir/CLAUDE.md')).toHaveLength(0)

    const excluded = scanProjectDeep(repo, undefined, { excludePaths: [path.join(repo, 'packages')] })
    expect(byPath(excluded.assets, 'packages/a/CLAUDE.md')).toHaveLength(0)
    expect(byPath(excluded.assets, 'nested-skill/SKILL.md')).toHaveLength(0)
  })

  it('is deterministic: same tree twice → identical id sets (A7)', () => {
    const repo = makeRepo()
    const first = scanProjectDeep(repo).assets.map((a) => a.id).sort()
    const second = scanProjectDeep(repo).assets.map((a) => a.id).sort()
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it('shares a depth-neutral cache with the shallow scanners without tag pollution (C2)', () => {
    const repo = makeRepo()
    const cache = new AssetFileCache<Asset[]>()

    // shallow first primes the cache; deep must still come out tagged deep …
    const shallowFirst = [...scanShallowConventions(repo, cache), ...scanProjectCapabilities(repo, cache)]
    expect(shallowFirst.every((a) => a.meta.scanDepth === 'shallow')).toBe(true)
    const deep = scanProjectDeep(repo, cache)
    expect(deep.assets.length).toBeGreaterThan(0)
    expect(deep.assets.every((a) => a.meta.scanDepth === 'deep')).toBe(true)

    // … and a shallow rescan over the deep-primed cache stays shallow.
    const shallowAgain = [...scanShallowConventions(repo, cache), ...scanProjectCapabilities(repo, cache)]
    expect(shallowAgain.every((a) => a.meta.scanDepth === 'shallow')).toBe(true)
  })

  it('accounts an unreadable source as a ScanError and keeps scanning (A1 错误不静默)', () => {
    const repo = makeRepo()
    // A directory named SKILL.md: globbed as a match, EISDIR on parse — the
    // TOCTOU/unreadable analog that must land in errors, not throw.
    fs.mkdirSync(path.join(repo, '.claude', 'skills', 'broken', 'SKILL.md'), { recursive: true })
    const { assets, errors } = scanProjectDeep(repo)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(byPath(assets, 'root-skill/SKILL.md')).toHaveLength(1)
  })

  it('returns empty for a blank projectDir', () => {
    expect(scanProjectDeep('')).toEqual({ assets: [], errors: [] })
  })
})
