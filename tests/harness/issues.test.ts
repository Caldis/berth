import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { collectIssues, formatIssuesReport } from '../../scripts/harness-issues.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-issues-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('harness-issues', () => {
  it('统计 active / resolved issues, 排除 AGENTS.md', () => {
    mkdirSync(join(root, 'docs/issues/resolved'), { recursive: true })
    writeFileSync(join(root, 'docs/issues/AGENTS.md'), 'rules')
    writeFileSync(join(root, 'docs/issues/2026-06-01-BUG-a.md'), '# a')
    writeFileSync(join(root, 'docs/issues/resolved/2026-05-31-IMPROVEMENT-b.md'), '# b')

    const issues = collectIssues(root)
    expect(issues.active.map((i: { name: string }) => i.name)).toEqual(['2026-06-01-BUG-a.md'])
    expect(issues.resolved.map((i: { name: string }) => i.name)).toEqual(['2026-05-31-IMPROVEMENT-b.md'])
  })

  it('报告给出 5.2-issues 收敛入口和 active issue 路径', () => {
    mkdirSync(join(root, 'docs/issues'), { recursive: true })
    writeFileSync(join(root, 'docs/issues/2026-06-01-IMPROVEMENT-a.md'), '# a')

    const report = formatIssuesReport(root)
    expect(report).toContain('harness-5.2-issues')
    expect(report).toContain('docs/issues/2026-06-01-IMPROVEMENT-a.md')
  })
})
