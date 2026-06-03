import { describe, expect, it, vi } from 'vitest'
import type { Asset, AssetStats } from '../../src/shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '../../src/shared/types/ipc'
import { AgentAssetRuntime, type AssetRuntimeScanner } from '../../src/main/engine/assets/runtime'
import { createProjectScopeCandidate } from '../../src/shared/scope'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
}

function sessionAsset(id: string): Asset {
  return {
    id,
    agentId: 'codex',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: id,
    path: `/tmp/${id}.jsonl`,
    meta: { projectPath: '/repo/berth' }
  }
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((next, fail) => {
    resolve = next
    reject = fail
  })
  return { promise, resolve, reject }
}

function createRuntime(scanner: AssetRuntimeScanner, ids: string[] = ['snapshot-1', 'snapshot-2']): AgentAssetRuntime {
  let idIndex = 0
  let tick = 0
  return new AgentAssetRuntime({
    projectDir: '/repo/berth',
    createScanner: () => scanner,
    now: () => `2026-06-03T00:00:0${tick++}.000Z`,
    createSnapshotId: () => ids[idIndex++] ?? `snapshot-${idIndex}`
  })
}

function createScanner(scanResult: ScanResult): AssetRuntimeScanner {
  const sources: AgentScanSourceGroup[] = [{
    agentId: 'codex',
    agentName: 'Codex',
    installed: true,
    roots: [],
    sources: []
  }]
  return {
    scanAll: vi.fn(async () => scanResult),
    getScanSourceGroups: vi.fn(async () => sources),
    getProjectScopeCandidates: vi.fn(() => [
      createProjectScopeCandidate({ path: '/repo/berth', source: 'current' })!
    ]),
    getProjectDir: () => '/repo/berth'
  }
}

describe('AgentAssetRuntime', () => {
  it('starts with an idle empty snapshot', () => {
    const runtime = createRuntime(createScanner({ assets: [], stats: emptyStats, errors: [] }))

    expect(runtime.getStatus()).toEqual({ state: 'idle', stale: false, projectDir: '/repo/berth' })
    expect(runtime.getSnapshot()).toMatchObject({
      id: 'initial',
      projectDir: '/repo/berth',
      assets: [],
      stats: emptyStats,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'idle', stale: false, projectDir: '/repo/berth' }
    })
  })

  it('reuses an in-flight scan and publishes a ready snapshot', async () => {
    const deferred = createDeferred<ScanResult>()
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(() => deferred.promise),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = createRuntime(scanner)

    await expect(runtime.refresh({ reason: 'startup' })).resolves.toMatchObject({
      state: 'scanning',
      reason: 'startup',
      stale: false
    })
    const waitForScan = runtime.refresh({ reason: 'manual', wait: true })

    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
    deferred.resolve({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })

    await expect(waitForScan).resolves.toMatchObject({
      state: 'ready',
      reason: 'startup',
      stale: false,
      lastCompletedAt: '2026-06-03T00:00:01.000Z'
    })
    expect(runtime.getSnapshot()).toMatchObject({
      id: 'snapshot-1',
      assets: [sessionAsset('session-1')],
      stats: { ...emptyStats, sessions: 1 },
      status: { state: 'ready', reason: 'startup', stale: false }
    })
  })

  it('caches selector results until the snapshot changes', async () => {
    const scanner = createScanner({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    const runtime = createRuntime(scanner)
    const derive = vi.fn((assets: Asset[]) => assets.filter((asset) => asset.type === 'session').length)

    await runtime.refresh({ reason: 'startup', wait: true })

    expect(runtime.select('session-count', (snapshot) => derive(snapshot.assets))).toBe(1)
    expect(runtime.select('session-count', (snapshot) => derive(snapshot.assets))).toBe(1)
    expect(derive).toHaveBeenCalledTimes(1)

    await runtime.refresh({ reason: 'manual', wait: true })

    expect(runtime.select('session-count', (snapshot) => derive(snapshot.assets))).toBe(1)
    expect(derive).toHaveBeenCalledTimes(2)
  })

  it('keeps the last snapshot and marks it stale when a later scan fails', async () => {
    const scanner = createScanner({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })
    vi.mocked(scanner.scanAll).mockRejectedValueOnce(new Error('scan failed'))

    await expect(runtime.refresh({ reason: 'manual', wait: true })).resolves.toMatchObject({
      state: 'error',
      reason: 'manual',
      stale: true,
      error: 'scan failed'
    })
    expect(runtime.getSnapshot().id).toBe('snapshot-1')
    expect(runtime.getSnapshot().assets).toHaveLength(1)
  })
})
