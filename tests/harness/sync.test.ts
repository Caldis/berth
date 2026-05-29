// tests/harness/sync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readlinkSync, existsSync } from 'node:fs'
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

describe('harness-sync', () => {
  it('apply 生成 8 个 verb 的 SKILL.md / 命令桩 / 双工具软链', () => {
    apply(root)
    expect(existsSync(join(root, '.agents/skills/opsx-explore/SKILL.md'))).toBe(true)
    expect(existsSync(join(root, '.claude/commands/opsx/explore.md'))).toBe(true)
    const link = readlinkSync(join(root, '.claude/skills/opsx-explore'))
    expect(link).toBe('../../.agents/skills/opsx-explore')
    expect(readlinkSync(join(root, '.codex/skills/opsx-explore'))).toBe('../../.agents/skills/opsx-explore')
  })

  it('apply 幂等: 二次运行零变更', () => {
    apply(root)
    const second = apply(root)
    expect(second.changed).toEqual([])
  })

  it('check: 同步后 ok, 删桩后报 drift', () => {
    apply(root)
    expect(check(root).ok).toBe(true)
    rmSync(join(root, '.claude/commands/opsx/verify.md'))
    const r = check(root)
    expect(r.ok).toBe(false)
    expect(r.drift.some((d: string) => d.includes('verify'))).toBe(true)
  })

  it('check: 桩内容漂移可被检出', () => {
    apply(root)
    writeFileSync(join(root, '.claude/commands/opsx/new.md'), 'tampered')
    expect(check(root).ok).toBe(false)
  })
})
