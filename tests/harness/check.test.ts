// tests/harness/check.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import {
  SMALL_CHANGE_EXEMPTION_CONSENT,
  checkWorks,
  checkFriction,
  checkTemplates,
  checkWorkflowSources,
  checkEntryRules
} from '../../scripts/harness-check.mjs'

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

  it('接受 CRLF frontmatter', () => {
    const dir = join(root, 'docs/works/2026-05-29-crlf')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'INDEX.md'), '---\r\ntask: t\r\ntype: feature\r\nphase: design\r\ncreated: 2026-05-29\r\n---\r\n')
    writeFileSync(join(dir, '00-PRD.md'), 'x')
    writeFileSync(join(dir, '01-ANALYSIS.md'), 'x')
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

describe('checkWorkflowSources', () => {
  const VERBS = ['new', 'continue', 'explore', 'design', 'implement', 'verify', 'archive', 'optimization']
  function writeWorkflow(empty: string[] = []): void {
    const dir = join(root, '.agents/workflow')
    mkdirSync(dir, { recursive: true })
    for (const f of ['_shared', ...VERBS]) {
      writeFileSync(join(dir, `${f}.md`), empty.includes(f) ? '   \n' : `# ${f}\nbody`)
    }
  }

  it('完整非空 playbook 通过', () => {
    writeWorkflow()
    expect(checkWorkflowSources(root)).toEqual([])
  })

  it('空 playbook 文件被检出', () => {
    writeWorkflow(['design'])
    const errs = checkWorkflowSources(root)
    expect(errs.some((e: string) => e.includes('empty') && e.includes('design.md'))).toBe(true)
  })

  it('孤儿 playbook 被检出', () => {
    writeWorkflow()
    writeFileSync(join(root, '.agents/workflow/bogus.md'), '# x')
    expect(checkWorkflowSources(root).some((e: string) => e.includes('unexpected'))).toBe(true)
  })
})

describe('checkEntryRules', () => {
  function writeEntryRules(options: { agents?: boolean; readme?: boolean }): void {
    if (options.agents) writeFileSync(join(root, 'AGENTS.md'), SMALL_CHANGE_EXEMPTION_CONSENT)
    if (options.readme) {
      mkdirSync(join(root, '.agents'), { recursive: true })
      writeFileSync(join(root, '.agents/README.md'), SMALL_CHANGE_EXEMPTION_CONSENT)
    }
  }

  it('根入口与 harness README 都声明小改动豁免确认规则时通过', () => {
    writeEntryRules({ agents: true, readme: true })
    expect(checkEntryRules(root)).toEqual([])
  })

  it('根 AGENTS.md 缺少小改动豁免确认规则时报错', () => {
    writeEntryRules({ readme: true })
    expect(checkEntryRules(root).some((e: string) => e.includes('AGENTS.md'))).toBe(true)
  })

  it('.agents README 缺少小改动豁免确认规则时报错', () => {
    writeEntryRules({ agents: true })
    expect(checkEntryRules(root).some((e: string) => e.includes('.agents/README.md'))).toBe(true)
  })
})
