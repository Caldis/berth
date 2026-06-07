import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { scanShallowConventions } from '../../src/main/engine/shallow-conventions'
import { dedupePathKey } from '../../src/shared/asset-dedupe'

// GH-113 T3b: the global scope shows every session-derived project's ROOT
// conventions via a cheap shallow index — root AGENTS.md / CLAUDE.md only, tagged
// with an owner so scope filtering attributes them to the right project.

let dir: string

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-shallow-'))
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Shared conventions\nbody')
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Claude conventions\nbody')
  // A nested CLAUDE.md and a skill must NOT be picked up by the shallow scan.
  fs.mkdirSync(path.join(dir, 'packages', 'app'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'packages', 'app', 'CLAUDE.md'), '# Nested\nbody')
  fs.mkdirSync(path.join(dir, '.agents', 'skills', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(dir, '.agents', 'skills', 'demo', 'SKILL.md'), '---\nname: demo\n---\nbody')
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('scanShallowConventions', () => {
  it('shallow-indexes root AGENTS.md + CLAUDE.md tagged with owner + scanDepth', () => {
    const assets = scanShallowConventions(dir)
    const agents = assets.find((a) => a.type === 'agents-md')
    const claude = assets.find((a) => a.type === 'claude-md' && a.path === path.join(dir, 'CLAUDE.md'))

    expect(agents).toBeDefined()
    expect(agents?.meta.scanDepth).toBe('shallow')
    expect(agents?.meta.projectPath).toBe(dir)
    expect(agents?.meta.dedupeKey).toBe(dedupePathKey(path.join(dir, 'AGENTS.md')))
    // AGENTS.md is cross-agent → visible in both claude and codex views.
    expect(agents?.meta.readByAgentIds).toEqual(['claude-code', 'codex'])

    expect(claude).toBeDefined()
    expect(claude?.meta.scanDepth).toBe('shallow')
    expect(claude?.meta.projectPath).toBe(dir)
  })

  it('does NOT deep-scan: no nested CLAUDE.md, skills, hooks or capability configs', () => {
    const assets = scanShallowConventions(dir)
    // Only root-level conventions; never the nested packages/app/CLAUDE.md.
    expect(assets.every((a) => a.type === 'agents-md' || a.type === 'claude-md')).toBe(true)
    expect(assets.some((a) => a.path.includes(`packages${path.sep}app`))).toBe(false)
    expect(assets.some((a) => a.type === 'skill')).toBe(false)
  })

  it('returns nothing for a project without conventions', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-empty-'))
    try {
      expect(scanShallowConventions(empty)).toEqual([])
    } finally {
      fs.rmSync(empty, { recursive: true, force: true })
    }
  })
})
