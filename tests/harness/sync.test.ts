// tests/harness/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readlinkSync, existsSync, lstatSync, readFileSync, mkdirSync } from 'node:fs'
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
  it('apply 生成 10 个有序 action 的 SKILL.md / Claude skill 分发', () => {
    apply(root)
    expect(existsSync(join(root, '.agents/skills/harness-1.0-explore/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.agents/skills/harness-3.1-polish/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.agents/skills/harness-5.1-friction/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.agents/skills/harness-5.1-optimization'))).toBe(false)
    expect(existsSync(join(root, '.agents/skills/harness-5.2-issues/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.agents/skills/harness-explore'))).toBe(false)
    expect(existsSync(join(root, '.claude/commands/opsx-explore.md'))).toBe(false)
    expectSkillDistribution(join(root, '.claude/skills/harness-1.0-explore'), '../../.agents/skills/harness-1.0-explore')
    expect(existsSync(join(root, '.codex/skills/harness-1.0-explore'))).toBe(false)
  })

  it('apply 幂等: 二次运行零变更', () => {
    apply(root)
    const second = apply(root)
    expect(second.changed).toEqual([])
  })

  it('check: 同步后 ok, 删除 Claude skill 分发后报 drift', () => {
    apply(root)
    expect(check(root).ok).toBe(true)
    rmSync(join(root, '.claude/skills/harness-4.0-verify'), { recursive: true, force: true })
    const r = check(root)
    expect(r.ok).toBe(false)
    expect(r.drift.some((d: string) => d.includes('verify'))).toBe(true)
  })

  it('check: skill 内容漂移可被检出', () => {
    apply(root)
    writeFileSync(join(root, '.agents/skills/harness-0.0-new/SKILL.md'), 'tampered')
    expect(check(root).ok).toBe(false)
  })

  it('check/apply: 旧 Claude command 桩会被视为漂移并清理', () => {
    apply(root)
    mkdirSync(join(root, '.claude/commands'), { recursive: true })
    const legacyCommand = join(root, '.claude/commands/opsx-new.md')
    writeFileSync(legacyCommand, 'legacy')
    expect(check(root).ok).toBe(false)

    const r = apply(root)
    expect(r.changed).toContain(legacyCommand)
    expect(existsSync(legacyCommand)).toBe(false)
    expect(check(root).ok).toBe(true)
  })

  it('check/apply: 旧 opsx、未编号 harness 与旧编号 action skill 分发会被视为漂移并清理', () => {
    apply(root)
    const legacyAgentSkill = join(root, '.agents/skills/opsx-new')
    const legacyClaudeSkill = join(root, '.claude/skills/opsx-new')
    const legacyCodexSkill = join(root, '.codex/skills/opsx-new')
    const legacyUnnumberedSkill = join(root, '.agents/skills/harness-new')
    const legacyUnnumberedClaudeSkill = join(root, '.claude/skills/harness-new')
    const legacyNumberedSkill = join(root, '.agents/skills/harness-5.1-optimization')
    const legacyNumberedClaudeSkill = join(root, '.claude/skills/harness-5.1-optimization')
    mkdirSync(legacyAgentSkill, { recursive: true })
    mkdirSync(legacyClaudeSkill, { recursive: true })
    mkdirSync(legacyCodexSkill, { recursive: true })
    mkdirSync(legacyUnnumberedSkill, { recursive: true })
    mkdirSync(legacyUnnumberedClaudeSkill, { recursive: true })
    mkdirSync(legacyNumberedSkill, { recursive: true })
    mkdirSync(legacyNumberedClaudeSkill, { recursive: true })

    const drift = check(root)
    expect(drift.ok).toBe(false)
    expect(drift.drift).toEqual(expect.arrayContaining([
      legacyAgentSkill,
      legacyClaudeSkill,
      legacyCodexSkill,
      legacyUnnumberedSkill,
      legacyUnnumberedClaudeSkill,
      legacyNumberedSkill,
      legacyNumberedClaudeSkill
    ]))

    apply(root)
    expect(existsSync(legacyAgentSkill)).toBe(false)
    expect(existsSync(legacyClaudeSkill)).toBe(false)
    expect(existsSync(legacyCodexSkill)).toBe(false)
    expect(existsSync(legacyUnnumberedSkill)).toBe(false)
    expect(existsSync(legacyUnnumberedClaudeSkill)).toBe(false)
    expect(existsSync(legacyNumberedSkill)).toBe(false)
    expect(existsSync(legacyNumberedClaudeSkill)).toBe(false)
    expect(check(root).ok).toBe(true)
  })
})
