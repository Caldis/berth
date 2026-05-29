// tests/harness/check.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { checkWorks, checkFriction, checkTemplates } from '../../scripts/harness-check.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-check-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function task(name: string, frontmatter: string, files: string[]): void {
  const dir = join(root, 'docs/works', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'INDEX.md'), `---\n${frontmatter}\n---\n`)
  for (const f of files) writeFileSync(join(dir, f), 'x')
}

describe('checkWorks', () => {
  it('feature 在 design 阶段须有 00-PRD + 01-ANALYSIS', () => {
    task('2026-05-29-SPFOODY-1-order-notes', 'task: t\ntype: feature\nphase: design\ncreated: 2026-05-29', [
      '00-PRD.md',
      '01-ANALYSIS.md'
    ])
    expect(checkWorks(root)).toEqual([])
  })

  it('design 阶段缺 01-ANALYSIS 报错', () => {
    task('2026-05-29-order-notes', 'task: t\ntype: feature\nphase: design\ncreated: 2026-05-29', ['00-PRD.md'])
    const errs = checkWorks(root)
    expect(errs.some((e: string) => e.includes('01-ANALYSIS.md'))).toBe(true)
  })

  it('非法目录命名报错', () => {
    task('OrderNotes', 'task: t\ntype: feature\nphase: explore\ncreated: 2026-05-29', ['00-PRD.md'])
    expect(checkWorks(root).some((e: string) => e.includes('naming'))).toBe(true)
  })

  it('非法 phase 枚举报错', () => {
    task('2026-05-29-x', 'task: t\ntype: feature\nphase: coding\ncreated: 2026-05-29', ['00-PRD.md'])
    expect(checkWorks(root).some((e: string) => e.includes('phase'))).toBe(true)
  })

  it('archive 阶段仍在 works 顶层报错', () => {
    task('2026-05-29-x', 'task: t\ntype: feature\nphase: archive\ncreated: 2026-05-29', [
      '00-PRD.md',
      '01-ANALYSIS.md',
      '02-SPEC.md',
      '03-PLAN.md'
    ])
    expect(checkWorks(root).some((e: string) => e.includes('_archive'))).toBe(true)
  })
})

describe('checkFriction', () => {
  it('合规命名通过, 非法命名报错', () => {
    mkdirSync(join(root, 'docs/friction'), { recursive: true })
    writeFileSync(join(root, 'docs/friction/20260529-implement-foo.md'), 'x')
    writeFileSync(join(root, 'docs/friction/bad-name.md'), 'x')
    const errs = checkFriction(root)
    expect(errs.some((e: string) => e.includes('bad-name'))).toBe(true)
    expect(errs.some((e: string) => e.includes('20260529-implement-foo'))).toBe(false)
  })

  it('接受全部 8 个 verb 阶段作为 phase 段', () => {
    mkdirSync(join(root, 'docs/friction'), { recursive: true })
    const phases = ['new', 'continue', 'explore', 'design', 'implement', 'verify', 'archive', 'optimization']
    for (const p of phases) writeFileSync(join(root, `docs/friction/20260530-${p}-sample.md`), 'x')
    expect(checkFriction(root)).toEqual([])
  })
})

describe('checkTemplates', () => {
  it('模板缺失报错', () => {
    expect(checkTemplates(root).length).toBeGreaterThan(0)
  })
})
