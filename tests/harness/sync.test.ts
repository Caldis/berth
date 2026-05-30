// tests/harness/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readlinkSync, existsSync, lstatSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import { apply, check } from '../../scripts/harness-sync.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-sync-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function expectSkillDistribution(path: string, target: string): void {
  if (lstatSync(path).isSymbolicLink()) {
    expect(readlinkSync(path)).toBe(target)
    return
  }

  const sourceSkill = join(root, target.replace(/^(\.\.\/)+/, ''), 'SKILL.md')
  const distributedSkill = join(path, 'SKILL.md')
  expect(existsSync(distributedSkill)).toBe(true)
  expect(readFileSync(distributedSkill, 'utf8')).toBe(readFileSync(sourceSkill, 'utf8'))
}

describe('harness-sync', () => {
  it('apply 生成 8 个 verb 的 SKILL.md / 命令桩 / Claude skill 分发', () => {
    apply(root)
    expect(existsSync(join(root, '.agents/skills/opsx-explore/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.claude/commands/opsx-explore.md'))).toBe(true)
    expectSkillDistribution(join(root, '.claude/skills/opsx-explore'), '../../.agents/skills/opsx-explore')
    expect(existsSync(join(root, '.codex/skills/opsx-explore'))).toBe(false)
  })

  it('apply 幂等: 二次运行零变更', () => {
    apply(root)
    const second = apply(root)
    expect(second.changed).toEqual([])
  })

  it('check: 同步后 ok, 删桩后报 drift', () => {
    apply(root)
    expect(check(root).ok).toBe(true)
    rmSync(join(root, '.claude/commands/opsx-verify.md'))
    const r = check(root)
    expect(r.ok).toBe(false)
    expect(r.drift.some((d: string) => d.includes('verify'))).toBe(true)
  })

  it('check: 桩内容漂移可被检出', () => {
    apply(root)
    writeFileSync(join(root, '.claude/commands/opsx-new.md'), 'tampered')
    expect(check(root).ok).toBe(false)
  })
})
