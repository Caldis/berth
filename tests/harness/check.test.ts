// tests/harness/check.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import {
  SMALL_CHANGE_EXEMPTION_CONSENT,
  TEST_DISCIPLINE_RULE,
  checkWorks,
  checkFriction,
  checkIssues,
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

function trackedFrontmatter(name: string, options: { type?: string; phase?: string; number?: number; itemId?: string } = {}): string {
  const number = options.number ?? Number(/-gh-(\d+)-/.exec(name)?.[1] || 1)
  return [
    `task: ${name}`,
    `task_id: GH-${number}`,
    `type: ${options.type || 'feature'}`,
    `phase: ${options.phase || 'explore'}`,
    'created: 2026-06-01',
    'issue:',
    `  number: ${number}`,
    '  repo: Caldis/berth',
    `  url: https://github.com/Caldis/berth/issues/${number}`,
    'gh_project:',
    `  item_id: ${options.itemId || `PVTI_${number}`}`
  ].join('\n')
}

describe('checkWorks', () => {
  it('feature 在 design 阶段须有 00-PRD + 01-ANALYSIS', () => {
    const name = '2026-05-29-gh-1-order-notes'
    task(name, trackedFrontmatter(name, { phase: 'design' }), [
      '00-PRD.md',
      '01-ANALYSIS.md'
    ])
    expect(checkWorks(root)).toEqual([])
  })

  it('接受 CRLF frontmatter', () => {
    const name = '2026-05-29-gh-2-crlf'
    const dir = join(root, `docs/works/${name}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'INDEX.md'), `---\r\n${trackedFrontmatter(name, { phase: 'design', number: 2 }).replace(/\n/g, '\r\n')}\r\n---\r\n`)
    writeFileSync(join(dir, '00-PRD.md'), 'x')
    writeFileSync(join(dir, '01-ANALYSIS.md'), 'x')
    expect(checkWorks(root)).toEqual([])
  })

  it('design 阶段缺 01-ANALYSIS 报错', () => {
    const name = '2026-05-29-gh-3-order-notes'
    task(name, trackedFrontmatter(name, { phase: 'design', number: 3 }), ['00-PRD.md'])
    const errs = checkWorks(root)
    expect(errs.some((e: string) => e.includes('01-ANALYSIS.md'))).toBe(true)
  })

  it('非法目录命名报错', () => {
    task('OrderNotes', 'task: t\ntype: feature\nphase: explore\ncreated: 2026-05-29', ['00-PRD.md'])
    expect(checkWorks(root).some((e: string) => e.includes('naming'))).toBe(true)
  })

  it('非法 phase 枚举报错', () => {
    const name = '2026-05-29-gh-4-x'
    task(name, trackedFrontmatter(name, { phase: 'coding', number: 4 }), ['00-PRD.md'])
    expect(checkWorks(root).some((e: string) => e.includes('phase'))).toBe(true)
  })

  it('archive 阶段仍在 works 顶层报错', () => {
    const name = '2026-05-29-gh-5-x'
    task(name, trackedFrontmatter(name, { phase: 'archive', number: 5 }), [
      '00-PRD.md',
      '01-ANALYSIS.md',
      '02-SPEC.md',
      '03-PLAN.md'
    ])
    expect(checkWorks(root).some((e: string) => e.includes('_archive'))).toBe(true)
  })

  it('polish 阶段须有 04-POLISH', () => {
    const name = '2026-05-29-gh-6-x'
    task(name, trackedFrontmatter(name, { phase: 'polish', number: 6 }), [
      '00-PRD.md',
      '01-ANALYSIS.md',
      '02-SPEC.md',
      '03-PLAN.md'
    ])
    expect(checkWorks(root).some((e: string) => e.includes('04-POLISH.md'))).toBe(true)
  })

  it('polish 阶段产物完整时通过', () => {
    const name = '2026-05-29-gh-7-x'
    task(name, trackedFrontmatter(name, { phase: 'polish', number: 7 }), [
      '00-PRD.md',
      '01-ANALYSIS.md',
      '02-SPEC.md',
      '03-PLAN.md',
      '04-POLISH.md'
    ])
    expect(checkWorks(root)).toEqual([])
  })

  it('active work 必须使用 gh issue 命名和 task_id', () => {
    task('2026-05-29-order-notes', trackedFrontmatter('2026-05-29-order-notes', { number: 8 }), ['00-PRD.md'])
    expect(checkWorks(root).some((e: string) => e.includes('{YYYY-MM-DD}-gh-{number}-{summary}'))).toBe(true)
  })

  it('active work 必须记录 issue 和 Project item 元数据', () => {
    const name = '2026-05-29-gh-9-order-notes'
    task(name, 'task: t\ntask_id: GH-9\ntype: feature\nphase: explore\ncreated: 2026-05-29', ['00-PRD.md'])
    const errs = checkWorks(root)
    expect(errs.some((e: string) => e.includes('issue.number'))).toBe(true)
    expect(errs.some((e: string) => e.includes('gh_project.item_id'))).toBe(true)
  })

  it('目录 issue number 必须与 task_id 和 issue.number 一致', () => {
    const name = '2026-05-29-gh-10-order-notes'
    task(name, trackedFrontmatter(name, { number: 11 }), ['00-PRD.md'])
    const errs = checkWorks(root)
    expect(errs.some((e: string) => e.includes('task_id'))).toBe(true)
    expect(errs.some((e: string) => e.includes('issue.number'))).toBe(true)
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

  it('接受全部 9 个 verb 阶段作为 phase 段', () => {
    mkdirSync(join(root, 'docs/friction'), { recursive: true })
    const phases = ['new', 'continue', 'explore', 'design', 'implement', 'verify', 'polish', 'archive', 'optimization']
    for (const p of phases) writeFileSync(join(root, `docs/friction/20260530-${p}-sample.md`), 'x')
    expect(checkFriction(root)).toEqual([])
  })
})

describe('checkIssues', () => {
  it('要求产品 issue 目录位于 docs/issues', () => {
    mkdirSync(join(root, 'docs/issues'), { recursive: true })
    writeFileSync(join(root, 'docs/issues/AGENTS.md'), 'x')
    expect(checkIssues(root)).toEqual([])
  })

  it('根 issues 目录复活时报错', () => {
    mkdirSync(join(root, 'docs/issues'), { recursive: true })
    mkdirSync(join(root, 'issues'), { recursive: true })
    writeFileSync(join(root, 'docs/issues/AGENTS.md'), 'x')
    expect(checkIssues(root).some((e: string) => e.includes('root directory named issues'))).toBe(true)
  })

  it('缺少 docs/issues/AGENTS.md 时报错', () => {
    mkdirSync(join(root, 'docs/issues'), { recursive: true })
    expect(checkIssues(root).some((e: string) => e.includes('AGENTS.md'))).toBe(true)
  })
})

describe('checkTemplates', () => {
  it('模板缺失报错', () => {
    expect(checkTemplates(root).length).toBeGreaterThan(0)
  })
})

describe('checkWorkflowSources', () => {
  const VERBS = ['new', 'continue', 'explore', 'design', 'implement', 'verify', 'polish', 'archive', 'optimization']
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
  function writeEntryRules(options: { agents?: boolean; readme?: boolean; sideIssue?: boolean; scopedCommit?: boolean }): void {
    if (options.agents) {
      const scopedCommit = options.scopedCommit === false ? '' : '\n自己相关 git diff --cached'
      writeFileSync(join(root, 'AGENTS.md'), SMALL_CHANGE_EXEMPTION_CONSENT + scopedCommit)
    }
    if (options.readme) {
      mkdirSync(join(root, '.agents'), { recursive: true })
      writeFileSync(join(root, '.agents/README.md'), SMALL_CHANGE_EXEMPTION_CONSENT)
    }
    if (options.sideIssue !== false) {
      mkdirSync(join(root, '.agents/workflow'), { recursive: true })
      mkdirSync(join(root, 'docs/issues'), { recursive: true })
      const text = '发现不属于当前主线验收范围的问题时写入 docs/issues。'
      writeFileSync(join(root, '.agents/workflow/_shared.md'), text)
      writeFileSync(join(root, '.agents/workflow/implement.md'), text)
      writeFileSync(join(root, '.agents/workflow/verify.md'), text)
      writeFileSync(join(root, 'docs/issues/AGENTS.md'), text)
    }
    if (options.scopedCommit !== false) {
      mkdirSync(join(root, '.agents/workflow'), { recursive: true })
      for (const rel of ['.agents/workflow/_shared.md', '.agents/workflow/implement.md', '.agents/workflow/archive.md']) {
        const path = join(root, rel)
        const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
        writeFileSync(path, current + '\n自己相关 git diff --cached')
      }
    }
    mkdirSync(join(root, 'docs/works/_template'), { recursive: true })
    for (const rel of [
      '.agents/workflow/_shared.md',
      '.agents/workflow/design.md',
      '.agents/workflow/implement.md',
      '.agents/workflow/verify.md',
      'docs/works/_template/02-SPEC.md',
      'docs/works/_template/03-PLAN.md'
    ]) {
      const path = join(root, rel)
      const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
      writeFileSync(path, current + '\n' + TEST_DISCIPLINE_RULE)
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

  it('缺少旁支产品问题记录规则时报错', () => {
    writeEntryRules({ agents: true, readme: true })
    writeFileSync(join(root, '.agents/workflow/implement.md'), 'docs/issues')
    expect(checkEntryRules(root).some((e: string) => e.includes('side product issue'))).toBe(true)
  })

  it('缺少频繁且限定范围提交规则时报错', () => {
    writeEntryRules({ agents: true, readme: true })
    writeFileSync(join(root, '.agents/workflow/archive.md'), '自己相关')
    expect(checkEntryRules(root).some((e: string) => e.includes('frequent scoped commit'))).toBe(true)
  })

  it('缺少测试证据规则时报错', () => {
    writeEntryRules({ agents: true, readme: true })
    writeFileSync(join(root, '.agents/workflow/implement.md'), 'docs/issues 不属于当前主线\n自己相关 git diff --cached')
    expect(checkEntryRules(root).some((e: string) => e.includes('test evidence'))).toBe(true)
  })
})
