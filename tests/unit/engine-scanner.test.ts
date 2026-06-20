import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Asset } from '@shared/types/asset'
import { sameProjectPath } from '@shared/scope'

const mocks = vi.hoisted(() => ({
  claudeScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  codexScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  claudeDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', code: 'claude.user.data-directory' }]
  })),
  claudeCoverage: vi.fn(async () => [
    {
      path: 'C:\\Users\\test\\.claude',
      scope: 'user',
      code: 'claude.user.data-directory',
      kind: 'directory',
      status: 'scanned'
    }
  ]),
  codexDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', code: 'codex.user.sessions' }]
  })),
  codexCoverage: vi.fn(async () => [
    {
      path: 'C:\\Users\\test\\.codex\\sessions',
      scope: 'user',
      code: 'codex.user.sessions',
      kind: 'directory',
      status: 'scanned'
    }
  ])
}))

vi.mock('@berth/scan-engine/adapters/claude-code', () => ({
  ClaudeCodeAdapter: class {
    id = 'claude-code'
    displayName = 'Claude Code'
    scanAll = mocks.claudeScanAll
    detect = mocks.claudeDetect
    scanSourceCoverage = mocks.claudeCoverage
  }
}))

vi.mock('@berth/scan-engine/adapters/codex', () => ({
  CodexAdapter: class {
    id = 'codex'
    displayName = 'Codex'
    scanAll = mocks.codexScanAll
    detect = mocks.codexDetect
    scanSourceCoverage = mocks.codexCoverage
  }
}))

vi.mock('@berth/scan-engine/agent-plugins/manifest', async (importActual) => ({
  ...(await importActual<typeof import('@berth/scan-engine/agent-plugins/manifest')>()),
  loadAgentPluginManifests: vi.fn(() => [])
}))

import { AssetScanner } from '@berth/scan-engine/engine/scanner'
import { PLANNED_AGENT_ADAPTER_DEFINITIONS } from '@berth/scan-engine/adapters/planned-agent-definitions'
import type { AssetScanProgress } from '@berth/scan-engine/shared/types/ipc'
import type { AdapterScanOptions } from '@berth/scan-engine/shared/types/asset'

describe('AssetScanner', () => {
  beforeEach(() => {
    mocks.claudeScanAll.mockClear()
    mocks.codexScanAll.mockClear()
    mocks.claudeDetect.mockClear()
    mocks.codexDetect.mockClear()
    mocks.claudeCoverage.mockClear()
    mocks.codexCoverage.mockClear()
    mocks.claudeDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', code: 'claude.user.data-directory' }]
    })
    mocks.codexDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', code: 'codex.user.sessions' }]
    })
    mocks.claudeCoverage.mockResolvedValue([
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        code: 'claude.user.data-directory',
        kind: 'directory',
        status: 'scanned'
      }
    ])
    mocks.codexCoverage.mockResolvedValue([
      {
        path: 'C:\\Users\\test\\.codex\\sessions',
        scope: 'user',
        code: 'codex.user.sessions',
        kind: 'directory',
        status: 'scanned'
      }
    ])
  })

  it('tracks whether a full scan has completed', async () => {
    const scanner = new AssetScanner()

    expect(scanner.hasScanned()).toBe(false)
    await scanner.scanAll()

    expect(scanner.hasScanned()).toBe(true)
  })

  it('reuses an in-flight full scan', async () => {
    const scanner = new AssetScanner()

    await Promise.all([scanner.scanAll(), scanner.scanAll()])

    expect(mocks.claudeScanAll).toHaveBeenCalledTimes(1)
    expect(mocks.codexScanAll).toHaveBeenCalledTimes(1)
  })

  it('reports scan source groups from every adapter without scanning assets', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-engine-scanner-home-'))
    const scanner = new AssetScanner(undefined, {
      adapterRegistry: {
        homeDir,
        env: {}
      }
    })

    const groups = await scanner.getScanSourceGroups()

    expect(groups).toHaveLength(2 + PLANNED_AGENT_ADAPTER_DEFINITIONS.length)
    expect(groups.slice(0, 2)).toEqual([
      expect.objectContaining({
        agentId: 'claude-code',
        agentName: 'Claude Code',
        installed: true,
        roots: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', code: 'claude.user.data-directory' }],
        sources: [
          {
            path: 'C:\\Users\\test\\.claude',
            scope: 'user',
            code: 'claude.user.data-directory',
            kind: 'directory',
            status: 'scanned'
          }
        ]
      }),
      expect.objectContaining({
        agentId: 'codex',
        agentName: 'Codex',
        installed: true,
        roots: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', code: 'codex.user.sessions' }],
        sources: [
          {
            path: 'C:\\Users\\test\\.codex\\sessions',
            scope: 'user',
            code: 'codex.user.sessions',
            kind: 'directory',
            status: 'scanned'
          }
        ]
      })
    ])
    expect(groups.slice(2).map((group) => group.agentId)).toEqual(
      PLANNED_AGENT_ADAPTER_DEFINITIONS.map((definition) => definition.id)
    )
    expect(groups.slice(2).every((group) => group.roots.length === 0)).toBe(true)
    expect(groups.find((group) => group.agentId === 'gemini-cli')?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'gemini.user.settings',
          path: path.join(homeDir, '.gemini', 'settings.json'),
          status: 'missing'
        })
      ])
    )
    expect(mocks.claudeScanAll).not.toHaveBeenCalled()
    expect(mocks.codexScanAll).not.toHaveBeenCalled()
    fs.rmSync(homeDir, { recursive: true, force: true })
  })

  it('adds session-derived project source candidates without scanning project directories', async () => {
    const projectPath = process.cwd()
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [
        {
          id: 'session-1',
          agentId: 'claude-code',
          category: 'state',
          type: 'session',
          scope: 'session',
          name: 'Session',
          path: 'C:\\Users\\test\\.claude\\projects\\session.jsonl',
          meta: { projectPath }
        }
      ],
      errors: []
    })
    const scanner = new AssetScanner()

    await scanner.scanAll()
    const groups = await scanner.getScanSourceGroups()

    expect(groups[0]?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: projectPath,
          scope: 'project',
          status: 'not-scanned',
          reason: 'session-derived-project'
        })
      ])
    )
    expect(mocks.claudeScanAll).toHaveBeenCalledTimes(1)
  })

  it('annotates equivalent hook sources across the same agent and hook identity', async () => {
    const userHook = hookAsset({
      id: 'claude-user-stop',
      agentId: 'claude-code',
      scope: 'user',
      path: 'C:\\Users\\test\\.claude\\settings.json',
      meta: {
        scenarioHash: 'scenario-stop',
        hookHash: 'hook-stop',
        enabled: false,
        managed: false
      }
    })
    const projectHook = hookAsset({
      id: 'claude-project-stop',
      agentId: 'claude-code',
      scope: 'project',
      path: 'D:\\repo\\.claude\\settings.json',
      meta: {
        scenarioHash: 'scenario-stop',
        hookHash: 'hook-stop',
        enabled: true,
        managed: true
      }
    })
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [userHook, projectHook],
      errors: []
    })
    const scanner = new AssetScanner()

    const result = await scanner.scanAll()

    expect(result.assets[0]?.meta).toMatchObject({
      equivalentSourceCount: 2,
      effectiveEnabled: true,
      equivalentSources: [
        {
          id: 'claude-user-stop',
          agentId: 'claude-code',
          scope: 'user',
          name: 'claude-user-stop',
          path: 'C:\\Users\\test\\.claude\\settings.json',
          enabled: false,
          managed: false
        },
        {
          id: 'claude-project-stop',
          agentId: 'claude-code',
          scope: 'project',
          name: 'claude-project-stop',
          path: 'D:\\repo\\.claude\\settings.json',
          enabled: true,
          managed: true
        }
      ]
    })
    expect(result.assets[1]?.meta.equivalentSourceCount).toBe(2)
  })

  it('merges the same physical AGENTS.md across adapters in final + partial (GH-113 T1)', async () => {
    const dedupeKey = 'd:\\code\\react-zmage\\agents.md'
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [agentsMdAsset('claude-agents', 'claude-code', ['claude-code'], dedupeKey)],
      errors: []
    })
    mocks.codexScanAll.mockResolvedValueOnce({
      assets: [agentsMdAsset('codex-agents', 'codex', ['codex'], dedupeKey)],
      errors: []
    })
    const scanner = new AssetScanner()

    const partials: { assets: Asset[] }[] = []
    const result = await scanner.scanAll({ onPartial: (p) => partials.push({ assets: p.assets }) })

    // Final snapshot: a single canonical row, claude-code primary, union readers.
    const agentsMd = result.assets.filter((a) => a.type === 'agents-md')
    expect(agentsMd).toHaveLength(1)
    expect(agentsMd[0]?.id).toBe('claude-agents')
    expect(agentsMd[0]?.agentId).toBe('claude-code')
    expect(agentsMd[0]?.meta.readByAgentIds).toEqual(['claude-code', 'codex'])

    // The partial emitted after the codex adapter must already be merged — no
    // transient double row while the scan is mid-flight.
    expect(partials.at(-1)?.assets.filter((a) => a.type === 'agents-md')).toHaveLength(1)
  })

  it('shallow-indexes session-derived projects, excluding the active one (GH-113 T3b)', async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-eng-shallow-'))
    fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# Other project conventions\nbody')
    const sessionFor = (dir: string): Asset => ({
      id: `session-${path.basename(dir)}`,
      agentId: 'claude-code',
      category: 'state',
      type: 'session',
      scope: 'session',
      name: 'Session',
      path: 'C:\\x\\session.jsonl',
      meta: { projectPath: dir }
    })
    try {
      // No active project → the session-derived project is shallow-indexed.
      mocks.claudeScanAll.mockResolvedValueOnce({ assets: [sessionFor(projectDir)], errors: [] })
      const globalScanner = new AssetScanner()
      const globalResult = await globalScanner.scanAll()
      const shallow = globalResult.assets.find(
        (a) => a.type === 'agents-md' && a.meta.scanDepth === 'shallow'
      )
      expect(shallow).toBeDefined()
      expect(sameProjectPath(String(shallow?.meta.projectPath), projectDir)).toBe(true)

      // When that project IS the active one, its conventions come from the deep
      // scan (here mocked empty) — the shallow pass must NOT duplicate it.
      mocks.claudeScanAll.mockResolvedValueOnce({ assets: [sessionFor(projectDir)], errors: [] })
      const activeScanner = new AssetScanner(projectDir)
      const activeResult = await activeScanner.scanAll()
      expect(activeResult.assets.some((a) => a.meta.scanDepth === 'shallow')).toBe(false)
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true })
    }
  })

  it('shallow-indexes the repo root when a session cwd is a monorepo subdir (GH-113 T3b)', async () => {
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-eng-repo-'))
    fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true })
    fs.writeFileSync(path.join(repoRoot, 'AGENTS.md'), '# Repo-root conventions\nbody')
    const subdir = path.join(repoRoot, 'packages', 'app')
    fs.mkdirSync(subdir, { recursive: true })
    try {
      mocks.claudeScanAll.mockResolvedValueOnce({
        assets: [{
          id: 'session-sub',
          agentId: 'claude-code',
          category: 'state',
          type: 'session',
          scope: 'session',
          name: 'Session',
          path: 'C:\\x\\session.jsonl',
          // Session cwd is the subdir, but the AGENTS.md lives at the repo root.
          meta: { projectPath: subdir }
        }],
        errors: []
      })
      const scanner = new AssetScanner()
      const result = await scanner.scanAll()
      const shallow = result.assets.find((a) => a.type === 'agents-md' && a.meta.scanDepth === 'shallow')
      expect(shallow).toBeDefined()
      expect(sameProjectPath(String(shallow?.meta.projectPath), repoRoot)).toBe(true)
    } finally {
      fs.rmSync(repoRoot, { recursive: true, force: true })
    }
  })

  it('streams per-adapter progress and cumulative partial assets (P4.6)', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-eng-partials-home-'))
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [skillAsset('claude-skill', 'claude-code')],
      errors: []
    })
    mocks.codexScanAll.mockResolvedValueOnce({
      assets: [skillAsset('codex-skill', 'codex')],
      errors: []
    })
    try {
      const scanner = new AssetScanner(undefined, {
        adapterRegistry: { homeDir, env: {} }
      })

      const progress: { phase: string; current: number; total: number; label?: string }[] = []
      const partials: { assets: Asset[] }[] = []
      await scanner.scanAll({
        onProgress: (event) => progress.push(event),
        onPartial: (partial) => partials.push({ assets: partial.assets })
      })

      const adapterCount = 2 + PLANNED_AGENT_ADAPTER_DEFINITIONS.length
      // Per-adapter granularity: total === adapter count (claude + codex + metadata-only declarations).
      expect(progress.every((p) => p.phase === 'parsing' && p.total === adapterCount)).toBe(true)
      expect(progress.at(-1)).toMatchObject({ current: adapterCount, total: adapterCount })

      // One partial per adapter; empty fixture homes make third-party adapters
      // contribute source metadata but no assets.
      expect(partials).toHaveLength(adapterCount)
      expect(partials[0]?.assets.map((a) => a.id)).toEqual(['claude-skill'])
      expect(partials[1]?.assets.map((a) => a.id)).toEqual(['claude-skill', 'codex-skill'])
      expect(partials.at(-1)?.assets.map((a) => a.id)).toEqual(['claude-skill', 'codex-skill'])
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true })
    }
  })

  it('strips raw from partials and reports the running error count (GH-111 P1+O4)', async () => {
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [{ ...skillAsset('s1', 'claude-code'), raw: 'A VERY LARGE TRANSCRIPT BODY' }],
      errors: [{ path: '/x', type: 'glob', message: 'boom' }]
    })
    mocks.codexScanAll.mockResolvedValueOnce({ assets: [], errors: [] })
    const scanner = new AssetScanner()

    const partials: { assets: Asset[]; errorCount?: number }[] = []
    const result = await scanner.scanAll({ onPartial: (p) => partials.push(p) })

    // Partial assets carry no raw body...
    expect(partials[0]?.assets[0]?.raw).toBeUndefined()
    // ...but the running error count is exposed...
    expect(partials[0]?.errorCount).toBe(1)
    // ...and the final ScanResult still retains the full raw.
    expect(result.assets.find((a) => a.id === 's1')?.raw).toBe('A VERY LARGE TRANSCRIPT BODY')
  })

  it('keeps other source groups visible when one adapter detection fails', async () => {
    mocks.claudeDetect.mockRejectedValueOnce(new Error('permission denied'))
    const scanner = new AssetScanner()

    const groups = await scanner.getScanSourceGroups()

    expect(groups[0]).toEqual({
      agentId: 'claude-code',
      agentName: 'Claude Code',
      installed: false,
      roots: [],
      sources: []
    })
    expect(groups[1]?.agentId).toBe('codex')
    expect(groups[1]?.installed).toBe(true)
  })

  it('threads onFileProgress into adapters and surfaces currentPath in progress (GH-10)', async () => {
    // The claude adapter bubbles two per-file paths during its scan.
    mocks.claudeScanAll.mockImplementationOnce(async (options?: AdapterScanOptions) => {
      options?.onFileProgress?.('C:\\Users\\test\\.claude\\projects\\p\\a.jsonl')
      options?.onFileProgress?.('C:\\Users\\test\\.claude\\projects\\p\\b.jsonl')
      return { assets: [], errors: [] }
    })
    const scanner = new AssetScanner()
    const progress: AssetScanProgress[] = []

    // progressCoalesceMs: 0 disables time-window collapse so every threaded tick is
    // observable in this instant-mock test (coalescing itself is unit-tested
    // separately in progress-coalescer.test.ts).
    await scanner.scanAll({ onProgress: (p) => progress.push(p), progressCoalesceMs: 0 })

    // At least one parsing tick carried a per-file currentPath...
    const withPath = progress.filter((p) => p.currentPath)
    expect(withPath.length).toBeGreaterThan(0)
    // ...and it kept the adapter-level phase/index/total so the bar stays meaningful.
    expect(withPath[0]).toMatchObject({ phase: 'parsing' })
    expect(withPath[0]?.total).toBeGreaterThan(0)
    expect(typeof withPath[0]?.current).toBe('number')
    expect(withPath.map((p) => p.currentPath)).toContain('C:\\Users\\test\\.claude\\projects\\p\\b.jsonl')
  })

  it('still emits adapter-level progress when no per-file path streams (GH-10 additive)', async () => {
    const scanner = new AssetScanner()
    const progress: AssetScanProgress[] = []

    await scanner.scanAll({ onProgress: (p) => progress.push(p), progressCoalesceMs: 0 })

    // Adapter-level ticks carry label, never a currentPath (backward compatible).
    expect(progress.some((p) => p.label === 'Claude Code')).toBe(true)
    expect(progress.every((p) => p.currentPath === undefined)).toBe(true)
  })
})

function skillAsset(id: string, agentId: string): Asset {
  return {
    id,
    agentId,
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: id,
    path: `C:\\Users\\test\\.claude\\skills\\${id}\\SKILL.md`,
    meta: {}
  }
}

function agentsMdAsset(
  id: string,
  agentId: string,
  readByAgentIds: string[],
  dedupeKey: string
): Asset {
  return {
    id,
    agentId,
    category: 'instruction',
    type: 'agents-md',
    scope: 'project',
    name: 'AGENTS.md',
    path: 'D:\\Code\\react-zmage\\AGENTS.md',
    meta: { dedupeKey, readByAgentIds }
  }
}

function hookAsset(overrides: Partial<Asset> & { id: string; agentId: string }): Asset {
  return {
    id: overrides.id,
    agentId: overrides.agentId,
    category: 'capability',
    type: 'hook',
    scope: overrides.scope ?? 'user',
    name: overrides.name ?? overrides.id,
    path: overrides.path ?? 'C:\\Users\\test\\.codex\\hooks.json',
    meta: {
      eventType: 'Stop',
      ...(overrides.meta ?? {})
    }
  }
}
