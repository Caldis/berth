import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  scanCapabilities,
  scanInstructions,
  scanIntegration,
  type ScanContext
} from '../../src/main/adapters/claude-code/scanner'

/**
 * GH-111 — coverage corrections from the Codex×Claude adversarial review.
 * C1: output styles live in `output-styles` (user + project), not `output-modes`.
 * C2: skills are `<name>/SKILL.md`; supporting `.md` files must NOT become skills,
 *     and the SKILL.md fallback name is the parent directory.
 */

let claudeDir: string
let projectDir: string

function ctx(): ScanContext {
  return { claudeDir, projectDir, projectDirs: [projectDir], errors: [] }
}

function write(file: string, content = '# x\n'): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

beforeEach(() => {
  claudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-gh111-claude-'))
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-gh111-proj-'))
})

afterEach(() => {
  fs.rmSync(claudeDir, { recursive: true, force: true })
  fs.rmSync(projectDir, { recursive: true, force: true })
})

describe('C1 output styles coverage', () => {
  it('scans user-level ~/.claude/output-styles/*.md as output-mode assets', () => {
    write(path.join(claudeDir, 'output-styles', 'concise.md'))
    const assets = scanInstructions(ctx())
    const om = assets.filter((a) => a.type === 'output-mode')
    expect(om.map((a) => a.name)).toContain('concise')
    expect(om.every((a) => a.scope === 'user' || a.scope === 'project')).toBe(true)
  })

  it('scans project-level .claude/output-styles/*.md as output-mode assets', () => {
    write(path.join(projectDir, '.claude', 'output-styles', 'verbose.md'))
    const assets = scanInstructions(ctx())
    const om = assets.find((a) => a.type === 'output-mode' && a.name === 'verbose')
    expect(om).toBeDefined()
    expect(om?.scope).toBe('project')
  })

  it('does NOT scan the legacy output-modes directory name', () => {
    write(path.join(claudeDir, 'output-modes', 'legacy.md'))
    const assets = scanInstructions(ctx())
    expect(assets.find((a) => a.type === 'output-mode' && a.name === 'legacy')).toBeUndefined()
  })
})

describe('O1 malformed settings.json is observable', () => {
  it('records a settings-json error for malformed settings (not silent)', () => {
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), '{ "hooks": [ BROKEN')
    const c = ctx()
    scanCapabilities(c)
    expect(c.errors.some((e) => e.type === 'settings-json' && e.path.endsWith('settings.json'))).toBe(true)
  })

  it('does not record an error when settings.json is simply absent', () => {
    const c = ctx()
    scanCapabilities(c)
    expect(c.errors.some((e) => e.type === 'settings-json')).toBe(false)
  })
})

describe('R1 stat TOCTOU does not abort the scan', () => {
  // Broken symlink → statSync throws ENOENT. Skipped on Windows where creating
  // symlinks needs elevation; Linux CI exercises the guard.
  it.skipIf(process.platform === 'win32')(
    'records a stat error and keeps scanning when a globbed entry fails to stat',
    () => {
      const ideDir = path.join(claudeDir, 'ide')
      fs.mkdirSync(ideDir, { recursive: true })
      fs.symlinkSync(path.join(ideDir, 'missing-target'), path.join(ideDir, 'broken.lock'))
      const c = ctx()
      expect(() => scanIntegration(c)).not.toThrow()
      expect(c.errors.some((e) => e.type === 'stat')).toBe(true)
    }
  )
})

describe('C2 skills SKILL.md coverage', () => {
  it('treats only SKILL.md as a skill and names it after the parent directory', () => {
    write(path.join(claudeDir, 'skills', 'foo', 'SKILL.md'), '# Foo skill\n')
    write(path.join(claudeDir, 'skills', 'foo', 'reference.md'), '# helper\n')
    const assets = scanInstructions(ctx())
    const skills = assets.filter((a) => a.type === 'skill')
    expect(skills).toHaveLength(1)
    expect(skills[0]?.name).toBe('foo')
  })

  it('still honors frontmatter name on SKILL.md', () => {
    write(
      path.join(claudeDir, 'skills', 'bar', 'SKILL.md'),
      '---\nname: custom-name\n---\n# body\n'
    )
    const assets = scanInstructions(ctx())
    const skill = assets.find((a) => a.type === 'skill')
    expect(skill?.name).toBe('custom-name')
  })
})
