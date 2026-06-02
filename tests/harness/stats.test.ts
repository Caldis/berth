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

function indexedTask(base: string, name: string, frontmatter: string): void {
  const dir = join(root, base, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'INDEX.md'), `---\ntask: ${name}\n${frontmatter}\n---\n`)
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

  it('聚合 debt pool, 使用 final 优先, 缺失记录为 unscored', () => {
    indexedTask(
      'docs/works',
      '2026-05-30-active-debt',
      [
        'type: feature',
        'phase: implement',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 9',
        '    repaid: 2',
        '    net: 7',
        '    scope: module',
        '    risk: medium',
        '    areas:',
        '      - architecture',
        '      - testability',
        '    confidence: medium'
      ].join('\n')
    )
    indexedTask(
      'docs/works/_archive',
      '2026-05-29-archived-maintenance',
      [
        'type: maintenance',
        'phase: archive',
        'created: 2026-05-29',
        'debt:',
        '  estimate:',
        '    incurred: 0',
        '    repaid: 3',
        '    net: -3',
        '    scope: module',
        '    risk: low',
        '    areas:',
        '      - architecture',
        '    confidence: low',
        '  final:',
        '    incurred: 1',
        '    repaid: 8',
        '    net: -7',
        '    scope: global',
        '    risk: medium',
        '    areas:',
        '      - tooling-ci',
        '    confidence: high'
      ].join('\n')
    )
    task('2026-05-30-unscored', 'explore')

    const s = collectStats(root)
    expect(s.debt.total).toBe(0)
    expect(s.debt.unscored).toBe(1)
    expect(s.debt.byType.feature).toBe(7)
    expect(s.debt.byType.maintenance).toBe(-7)
    expect(s.debt.byArea.architecture).toBe(7)
    expect(s.debt.byArea.testability).toBe(7)
    expect(s.debt.byArea['tooling-ci']).toBe(-7)
    expect(s.debt.status).toBe('ok')
  })

  it('debt total 达到阈值时给出状态', () => {
    indexedTask(
      'docs/works',
      '2026-05-30-high-debt',
      [
        'type: feature',
        'phase: verify',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 45',
        '    repaid: 0',
        '    net: 45',
        '    scope: global',
        '    risk: high',
        '    areas:',
        '      - architecture',
        '    confidence: medium'
      ].join('\n')
    )
    expect(collectStats(root).debt.status).toBe('recommend-maintenance')
  })

  it('debt 未达到维护阈值时不推荐 maintenance subtype', () => {
    indexedTask(
      'docs/works',
      '2026-05-30-low-debt',
      [
        'type: feature',
        'phase: verify',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 10',
        '    repaid: 0',
        '    net: 10',
        '    scope: module',
        '    risk: medium',
        '    areas:',
        '      - ui-ux',
        '    confidence: medium'
      ].join('\n')
    )
    expect(collectStats(root).debt.maintenanceRecommendation).toBeNull()
  })

  it('maintenance subtype 平局时 docs 优先于 architecture', () => {
    indexedTask(
      'docs/works',
      '2026-05-30-docs-debt',
      [
        'type: feature',
        'phase: verify',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 40',
        '    repaid: 0',
        '    net: 40',
        '    scope: module',
        '    risk: medium',
        '    areas:',
        '      - docs',
        '      - architecture',
        '    confidence: medium'
      ].join('\n')
    )
    expect(collectStats(root).debt.maintenanceRecommendation).toMatchObject({
      subtype: 'docs',
      area: 'docs',
      score: 40
    })
  })

  it('architecture 未满足保护条件时跳过到下一个 area', () => {
    indexedTask(
      'docs/works',
      '2026-05-30-arch-debt',
      [
        'type: feature',
        'phase: verify',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 38',
        '    repaid: 0',
        '    net: 38',
        '    scope: module',
        '    risk: medium',
        '    areas:',
        '      - architecture',
        '    confidence: medium'
      ].join('\n')
    )
    indexedTask(
      'docs/works',
      '2026-05-30-ui-debt',
      [
        'type: feature',
        'phase: verify',
        'created: 2026-05-30',
        'debt:',
        '  estimate:',
        '    incurred: 7',
        '    repaid: 0',
        '    net: 7',
        '    scope: module',
        '    risk: medium',
        '    areas:',
        '      - ui-ux',
        '    confidence: medium'
      ].join('\n')
    )
    expect(collectStats(root).debt.maintenanceRecommendation).toMatchObject({
      subtype: 'ui-ux',
      area: 'ui-ux',
      score: 7
    })
  })
})
