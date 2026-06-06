import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { runScan } from '../src/engine-bridge'

let homeDir: string
let projectDir: string
const env = { ...process.env, BERTH_EXTRA_CLAUDE_DIRS: '', BERTH_EXTRA_CODEX_HOMES: '' }

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-scan-bridge-'))
  homeDir = path.join(tmp, 'home')
  projectDir = path.join(tmp, 'project')

  // user-scope skill + agent
  writeFile(
    path.join(homeDir, '.claude', 'skills', 'demo-skill', 'SKILL.md'),
    '---\nname: demo-skill\ndescription: A demo skill\n---\nbody'
  )
  writeFile(
    path.join(homeDir, '.claude', 'agents', 'demo-agent.md'),
    '---\nname: demo-agent\ndescription: A demo agent\n---\nbody'
  )
  // project-scope convention + skill
  writeFile(path.join(projectDir, 'CLAUDE.md'), '# Project conventions')
  writeFile(
    path.join(projectDir, '.claude', 'skills', 'proj-skill', 'SKILL.md'),
    '---\nname: proj-skill\ndescription: project skill\n---\nbody'
  )
})

describe('runScan (engine bridge, fixture HOME)', () => {
  it('discovers user-scope skills and agents from the injected home', async () => {
    const snap = await runScan({ homeDir, projectDir, env })
    expect(snap.assets.filter((a) => a.type === 'skill').map((s) => s.name)).toContain('demo-skill')
    expect(snap.assets.filter((a) => a.type === 'agent').map((a) => a.name)).toContain('demo-agent')
  })

  it('discovers project-scope conventions and skills', async () => {
    const snap = await runScan({ homeDir, projectDir, env })
    expect(snap.assets.some((a) => a.type === 'claude-md' && a.scope === 'project')).toBe(true)
    expect(
      snap.assets.filter((a) => a.type === 'skill' && a.scope === 'project').map((s) => s.name)
    ).toContain('proj-skill')
  })

  it('returns scan-source coverage and stats', async () => {
    const snap = await runScan({ homeDir, projectDir, env })
    expect(snap.sources.length).toBeGreaterThan(0)
    expect(snap.stats.skills).toBeGreaterThanOrEqual(2)
  })
})
