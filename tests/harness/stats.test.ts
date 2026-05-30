// tests/harness/stats.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { collectStats } from '../../scripts/harness-stats.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-stats-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function task(name: string, phase: string): void {
  const dir = join(root, 'docs/works', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'INDEX.md'), `---\ntask: ${name}\ntype: feature\nphase: ${phase}\ncreated: 2026-05-30\n---\n`)
}

describe('collectStats', () => {
  it('空仓库: 全 0', () => {
    const s = collectStats(root)
    expect(s.works.active).toBe(0)
    expect(s.friction.active).toBe(0)
    expect(s.issues.active).toBe(0)
    expect(s.works.archived).toBe(0)
  })

  it('按 phase 聚合活动 works', () => {
    task('2026-05-30-a', 'explore')
    task('2026-05-30-b', 'explore')
    task('2026-05-30-c', 'verify')
    const s = collectStats(root)
    expect(s.works.active).toBe(3)
    expect(s.works.byPhase.explore).toBe(2)
    expect(s.works.byPhase.verify).toBe(1)
  })

  it('统计归档 works 与活动/归档 friction', () => {
    mkdirSync(join(root, 'docs/works/_archive/2026-05-30-old'), { recursive: true })
    mkdirSync(join(root, 'docs/friction/_archive'), { recursive: true })
    writeFileSync(join(root, 'docs/friction/20260530-verify-x.md'), 'x')
    writeFileSync(join(root, 'docs/friction/_archive/20260529-design-y.md'), 'x')
    const s = collectStats(root)
    expect(s.works.archived).toBe(1)
    expect(s.friction.active).toBe(1)
    expect(s.friction.archived).toBe(1)
  })

  it('统计 active/resolved 产品 issues', () => {
    mkdirSync(join(root, 'docs/issues/resolved'), { recursive: true })
    writeFileSync(join(root, 'docs/issues/AGENTS.md'), 'x')
    writeFileSync(join(root, 'docs/issues/2026-05-30-BUG-a.md'), 'x')
    writeFileSync(join(root, 'docs/issues/resolved/2026-05-29-IMPROVEMENT-b.md'), 'x')
    const s = collectStats(root)
    expect(s.issues.active).toBe(1)
    expect(s.issues.resolved).toBe(1)
  })
})
