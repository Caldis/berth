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
  id?: string
  type: string
  name: string
  scope: string
}
interface ScanPayload {
  assets?: AssetLike[]
  stats?: { skills: number }
  sources?: unknown[]
  commands?: Array<{ name: string }>
  counts?: { assets: number; errors: number; sources: number }
  count?: number
  results?: Array<{ asset?: AssetLike }>
  error?: { code: string }
  asset?: AssetLike
  relations?: unknown[]
  checks?: unknown[]
  usage?: unknown
  sessions?: unknown[]
  command?: { name: string; usage: string }
  importChain?: unknown
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

    // Instruction coverage — exact. Includes components bundled by demo-plugin
    // (plugin-skill / plugin-agent / plugin-cmd) and the Codex plugin skill
    // (cx-plugin-skill), proving plugin descent for both agents.
    expect(namesOfType(assets, 'skill')).toEqual([
      'codex-helper',
      'cx-plugin-skill',
      'greet',
      'plugin-skill',
      'proj'
    ])
    expect(namesOfType(assets, 'agent')).toEqual(['plugin-agent', 'reviewer'])
    expect(namesOfType(assets, 'command')).toEqual(['deploy', 'plugin-cmd'])
    expect(namesOfType(assets, 'output-mode')).toEqual(['concise'])
    // user CLAUDE.md + project CLAUDE.md + nested sub/CLAUDE.md + project .claude/CLAUDE.local.md
    expect(assets.filter((a) => a.type === 'claude-md').length).toBe(4)
    expect(assets.filter((a) => a.type === 'agents-md').length).toBe(1) // codex user

    // Plugin + marketplace assets (Claude demo-plugin + Codex cx-plugin).
    expect(namesOfType(assets, 'plugin')).toEqual(['cx-plugin', 'demo-plugin'])
    expect(namesOfType(assets, 'marketplace')).toEqual(['acme'])

    // Capability coverage — incl. the plugin-bundled MCP server.
    const mcp = namesOfType(assets, 'mcp-server')
    expect(mcp).toContain('fixture-user-mcp') // ~/.claude.json top-level
    expect(mcp).toContain('fixture-project-mcp') // project .mcp.json
    expect(mcp).toContain('fixture-plugin-mcp') // bundled by demo-plugin
    expect(mcp).toContain('fixture-projectmap-mcp') // ~/.claude.json projects[].mcpServers
    expect(assets.some((a) => a.type === 'hook')).toBe(true)

    expect(payload.stats?.skills).toBe(5) // greet + proj + codex-helper + plugin-skill + cx-plugin-skill
  })

  it('assets --type skill --scope user --agent claude-code includes user + plugin skills', async () => {
    const { code, payload } = await runCli(
      withFixture(['assets', '--type', 'skill', '--scope', 'user', '--agent', 'claude-code', '--json'])
    )
    expect(code).toBe(EXIT.OK)
    // greet (user dir) + plugin-skill (bundled by demo-plugin, user scope, claude-code).
    expect(namesOfType(payload.assets ?? [], 'skill')).toEqual(['greet', 'plugin-skill'])
  })

  it('assets --type skill --scope user returns all user-scope skills (claude + plugin + codex)', async () => {
    const { payload } = await runCli(withFixture(['assets', '--type', 'skill', '--scope', 'user', '--json']))
    expect(namesOfType(payload.assets ?? [], 'skill')).toEqual([
      'codex-helper',
      'cx-plugin-skill',
      'greet',
      'plugin-skill'
    ])
  })

  it('sources reports scan-source coverage', async () => {
    const { code, payload } = await runCli(withFixture(['sources', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(Array.isArray(payload.sources)).toBe(true)
    expect((payload.sources ?? []).length).toBeGreaterThan(0)
  })

  it('help lists the full command surface', async () => {
    const { code, payload } = await runCli(['help', '--json'])
    expect(code).toBe(EXIT.OK)
    expect((payload.commands ?? []).map((c) => c.name)).toContain('scan')
  })

  // CLI completion: the 6 previously-unwired commands now run standalone.
  it('snapshot returns counts without the full asset list', async () => {
    const { code, payload } = await runCli(withFixture(['snapshot', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(payload.counts?.assets).toBeGreaterThan(0)
    expect(payload.assets).toBeUndefined()
  })

  it('search finds an asset by name', async () => {
    const { code, payload } = await runCli(withFixture(['search', 'greet', '--json']))
    expect(code).toBe(EXIT.OK)
    expect((payload.results ?? []).some((r) => r.asset?.name === 'greet')).toBe(true)
  })

  it('search with no match exits NO_DATA', async () => {
    // Single garbage token (no common subwords) → MiniSearch finds nothing.
    const { code } = await runCli(withFixture(['search', 'qqqzzzxyywv', '--json']))
    expect(code).toBe(EXIT.NO_DATA)
  })

  it('search without a query exits ERROR', async () => {
    const { code, payload } = await runCli(withFixture(['search', '--json']))
    expect(code).toBe(EXIT.ERROR)
    expect(payload.error?.code).toBe('missing-query')
  })

  it('inspect shows a single asset by id with relations', async () => {
    const scan = await runCli(withFixture(['scan', '--json']))
    const greet = (scan.payload.assets ?? []).find((a) => a.type === 'skill' && a.name === 'greet')
    expect(greet?.id).toBeTruthy()
    const { code, payload } = await runCli(withFixture(['inspect', greet!.id!, '--relations', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(payload.asset?.name).toBe('greet')
    expect(Array.isArray(payload.relations)).toBe(true)
  })

  it('inspect of an unknown id exits NO_DATA', async () => {
    const { code } = await runCli(withFixture(['inspect', 'no-such-id', '--json']))
    expect(code).toBe(EXIT.NO_DATA)
  })

  it('health runs diagnostic checks', async () => {
    const { code, payload } = await runCli(withFixture(['health', '--json']))
    expect([EXIT.OK, EXIT.ATTENTION]).toContain(code)
    expect(Array.isArray(payload.checks)).toBe(true)
  })

  it('usage returns a summary', async () => {
    const { code, payload } = await runCli(withFixture(['usage', '--days', '7', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(payload.usage).toBeDefined()
  })

  it('sessions enumerates session assets', async () => {
    const { code } = await runCli(withFixture(['sessions', '--limit', '5', '--json']))
    expect([EXIT.OK, EXIT.NO_DATA]).toContain(code)
  })

  it('help <command> returns the detailed manual for one command', async () => {
    const { code, payload } = await runCli(['help', 'search', '--json'])
    expect(code).toBe(EXIT.OK)
    expect(payload.command?.name).toBe('search')
    expect(payload.command?.usage).toContain('berth-scan search')
  })

  it('help of an unknown command exits ERROR', async () => {
    const { code, payload } = await runCli(['help', 'no-such-command', '--json'])
    expect(code).toBe(EXIT.ERROR)
    expect(payload.error?.code).toBe('unknown-command')
  })

  it('inspect --import-chain includes the resolved import chain', async () => {
    const scan = await runCli(withFixture(['scan', '--json']))
    const md = (scan.payload.assets ?? []).find((a) => a.type === 'claude-md')
    expect(md?.id).toBeTruthy()
    const { code, payload } = await runCli(withFixture(['inspect', md!.id!, '--import-chain', '--json']))
    expect(code).toBe(EXIT.OK)
    expect(payload.importChain).toBeDefined()
  })

  it('an unknown command exits ERROR', async () => {
    const { code, payload } = await runCli(withFixture(['frobnicate', '--json']))
    expect(code).toBe(EXIT.ERROR)
    expect(payload.error?.code).toBe('unknown-command')
  })
})
