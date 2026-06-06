import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { run } from '../src/cli'
import { EXIT } from '../src/cli-args'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_SRC = path.resolve(here, '../fixtures/e2e')

// The committed fixture lives inside the berth git repo. Scanning it in place
// would make resolveProjectConfigRoots() walk up to the repo root and pull the
// repo's own .claude assets into the result. Copy it to an OS temp dir (outside
// any git repo) so project-root resolution stops at the fixture and the scan is
// fully isolated/deterministic.
let TEST_HOME: string
let TEST_PROJECT: string
let tmpRoot: string

const saved: Record<string, string | undefined> = {}
function neutralize(key: string): void {
  saved[key] = process.env[key]
  process.env[key] = ''
}

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-cli-e2e-'))
  fs.cpSync(FIXTURE_SRC, tmpRoot, { recursive: true })
  TEST_HOME = path.join(tmpRoot, 'home')
  TEST_PROJECT = path.join(tmpRoot, 'project')
  neutralize('BERTH_EXTRA_CLAUDE_DIRS')
  neutralize('BERTH_EXTRA_CODEX_HOMES')
  neutralize('BERTH_AGENT_PLUGIN_MANIFESTS')
})

afterAll(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true })
})

interface AssetLike {
  type: string
  name: string
  scope: string
}
interface ScanPayload {
  assets?: AssetLike[]
  stats?: { skills: number }
  sources?: unknown[]
  commands?: Array<{ name: string }>
}
interface CliResult {
  code: number
  payload: ScanPayload
  stdout: string
}

async function runCli(args: string[]): Promise<CliResult> {
  const chunks: string[] = []
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'))
      return true
    })
  let code: number
  try {
    code = await run(args)
  } finally {
    spy.mockRestore()
  }
  const stdout = chunks.join('')
  let payload: ScanPayload = {}
  try {
    payload = JSON.parse(stdout) as ScanPayload
  } catch {
    /* non-JSON output */
  }
  return { code, payload, stdout }
}

function namesOfType(assets: Array<{ type: string; name: string }>, type: string): string[] {
  return assets
    .filter((a) => a.type === type)
    .map((a) => a.name)
    .sort()
}

function withFixture(args: string[]): string[] {
  return ['--home-dir', TEST_HOME, '--project', TEST_PROJECT, ...args]
}

describe('berth-scan CLI E2E (isolated fixture HOME, in-process)', () => {
  it('scan emits a deterministic asset snapshot with exit 0', async () => {
    const { code, payload } = await runCli(withFixture(['scan', '--json']))
    expect(code).toBe(EXIT.OK)
    const assets = payload.assets ?? []

    // Instruction coverage — exact, fully controlled by the fixture.
    expect(namesOfType(assets, 'skill')).toEqual(['codex-helper', 'greet', 'proj'])
    expect(namesOfType(assets, 'agent')).toEqual(['reviewer'])
    expect(namesOfType(assets, 'command')).toEqual(['deploy'])
    expect(namesOfType(assets, 'output-mode')).toEqual(['concise'])
    expect(assets.filter((a) => a.type === 'claude-md').length).toBe(2) // user + project
    expect(assets.filter((a) => a.type === 'agents-md').length).toBe(1) // codex user

    // Capability coverage — presence (counts vary by parser granularity).
    const mcp = namesOfType(assets, 'mcp-server')
    expect(mcp).toContain('fixture-user-mcp')
    expect(mcp).toContain('fixture-project-mcp')
    expect(assets.some((a) => a.type === 'hook')).toBe(true)

    expect(payload.stats?.skills).toBe(3)
  })

  it('assets --type skill --scope user --agent claude-code isolates the Claude user skill', async () => {
    const { code, payload } = await runCli(
      withFixture(['assets', '--type', 'skill', '--scope', 'user', '--agent', 'claude-code', '--json'])
    )
    expect(code).toBe(EXIT.OK)
    expect(namesOfType(payload.assets ?? [], 'skill')).toEqual(['greet'])
  })

  it('assets --type skill --scope user returns both user-scope skills (claude + codex)', async () => {
    const { payload } = await runCli(withFixture(['assets', '--type', 'skill', '--scope', 'user', '--json']))
    expect(namesOfType(payload.assets ?? [], 'skill')).toEqual(['codex-helper', 'greet'])
  })

  it('sources reports scan-source coverage', async () => {
    const { code, payload } = await runCli(withFixture(['sources', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(Array.isArray(payload.sources)).toBe(true)
    expect(payload.sources.length).toBeGreaterThan(0)
  })

  it('help lists the full command surface', async () => {
    const { code, payload } = await runCli(['help', '--json'])
    expect(code).toBe(EXIT.OK)
    expect((payload.commands ?? []).map((c) => c.name)).toContain('scan')
  })
})
