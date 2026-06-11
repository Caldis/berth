import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { runScan } from '../src/engine-bridge'
import { resolveRelations } from '../src/engine/relations'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_SRC = path.resolve(here, '../fixtures/e2e')

let TEST_HOME: string
let tmpRoot: string
const saved: Record<string, string | undefined> = {}

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-plugin-rel-'))
  fs.cpSync(FIXTURE_SRC, tmpRoot, { recursive: true })
  TEST_HOME = path.join(tmpRoot, 'home')
  for (const k of ['BERTH_EXTRA_CLAUDE_DIRS', 'BERTH_EXTRA_CODEX_HOMES', 'BERTH_AGENT_PLUGIN_MANIFESTS']) {
    saved[k] = process.env[k]
    process.env[k] = ''
  }
})

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function pluginIdOf(meta: Record<string, unknown>): string | undefined {
  return typeof meta.pluginId === 'string' ? meta.pluginId : undefined
}

describe('plugin descent + relations', () => {
  it('descends demo-plugin into skill/agent/command/hook/mcp tagged with pluginId', async () => {
    const snap = await runScan({ homeDir: TEST_HOME, env: process.env })
    const plugin = snap.assets.find((a) => a.type === 'plugin' && a.name === 'demo-plugin')
    expect(plugin).toBeTruthy()
    const components = snap.assets.filter((a) => pluginIdOf(a.meta) === plugin!.id)
    const componentTypes = components.map((c) => c.type).sort()
    expect(componentTypes).toEqual(['agent', 'command', 'hook', 'mcp-server', 'skill'])
  })

  it('plugin contains its components and components belong-to the plugin', async () => {
    const snap = await runScan({ homeDir: TEST_HOME, env: process.env })
    const plugin = snap.assets.find((a) => a.type === 'plugin' && a.name === 'demo-plugin')!
    const components = snap.assets.filter((a) => pluginIdOf(a.meta) === plugin.id)

    const contained = resolveRelations(plugin, snap.assets)
      .filter((r) => r.kind === 'contains')
      .map((r) => r.to)

    for (const component of components) {
      expect(contained).toContain(component.id)
      const belongsTo = resolveRelations(component, snap.assets).some(
        (r) => r.kind === 'belongs-to' && r.to === plugin.id
      )
      expect(belongsTo).toBe(true)
    }
  })

  it('marks the plugin enabled from settings.enabledPlugins', async () => {
    const snap = await runScan({ homeDir: TEST_HOME, env: process.env })
    const plugin = snap.assets.find((a) => a.type === 'plugin' && a.name === 'demo-plugin')!
    expect(plugin.meta.enabled).toBe(true)
    expect(plugin.meta.marketplace).toBe('acme')
  })

  it('resolves @import relations from user CLAUDE.md to the imported skill', async () => {
    const snap = await runScan({ homeDir: TEST_HOME, env: process.env })
    const claudeMd = snap.assets.find((a) => a.type === 'claude-md' && a.scope === 'user')
    const greet = snap.assets.find((a) => a.type === 'skill' && a.name === 'greet')
    expect(claudeMd).toBeTruthy()
    expect(greet).toBeTruthy()
    const rels = resolveRelations(claudeMd!, snap.assets)
    expect(rels.some((r) => r.kind === 'imports' && r.to === greet!.id)).toBe(true)
  })

  it('descends a Codex plugin (cx-plugin) and links its skill', async () => {
    const snap = await runScan({ homeDir: TEST_HOME, env: process.env })
    const plugin = snap.assets.find((a) => a.type === 'plugin' && a.name === 'cx-plugin')
    expect(plugin).toBeTruthy()
    const components = snap.assets.filter((a) => pluginIdOf(a.meta) === plugin!.id)
    expect(components.map((c) => c.name)).toContain('cx-plugin-skill')
    const contained = resolveRelations(plugin!, snap.assets)
      .filter((r) => r.kind === 'contains')
      .map((r) => r.to)
    for (const component of components) {
      expect(contained).toContain(component.id)
      expect(
        resolveRelations(component, snap.assets).some((r) => r.kind === 'belongs-to' && r.to === plugin!.id)
      ).toBe(true)
    }
  })
})
