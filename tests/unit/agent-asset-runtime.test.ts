import { describe, expect, it, vi } from 'vitest'
import type { Asset, AssetStats } from '../../src/shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '../../src/shared/types/ipc'
import { AgentAssetRuntime, type AssetRuntimeScanner } from '../../src/main/engine/assets/runtime'
import { createProjectScopeCandidate, normalizeProjectPathKey } from '../../src/shared/scope'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
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

  it('maps scanner progress into runtime status', async () => {
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        options?.onProgress?.({ phase: 'parsing', current: 5, total: 10, label: 'sessions' })
        return { assets: [], stats: emptyStats, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = createRuntime(scanner)
    const refresh = runtime.refresh({ reason: 'startup', wait: true })

    expect(runtime.getStatus()).toMatchObject({
      state: 'scanning',
      progress: { phase: 'parsing', current: 5, total: 10, label: 'sessions' }
    })
    await refresh
  })

  it('folds partial assets into the live snapshot and notifies the progress listener (P4.6)', async () => {
    const partialAsset = sessionAsset('session-partial')
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        options?.onProgress?.({ phase: 'parsing', current: 0, total: 2 })
        options?.onPartial?.({ assets: [partialAsset], stats: { ...emptyStats, sessions: 1 } })
        return { assets: [partialAsset], stats: { ...emptyStats, sessions: 1 }, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = createRuntime(scanner)
    const payloads: { hasPartial: boolean; assetCount: number }[] = []
    runtime.setProgressListener((payload) =>
      payloads.push({ hasPartial: payload.partial != null, assetCount: payload.partial?.assets.length ?? 0 })
    )

    await runtime.refresh({ reason: 'startup', wait: true })

    // A partial was forwarded with the cumulative asset(s).
    expect(payloads.some((p) => p.hasPartial && p.assetCount === 1)).toBe(true)
    // Progress-only ticks (no partial) are forwarded too.
    expect(payloads.some((p) => !p.hasPartial)).toBe(true)
    // Final ready snapshot reflects the scanned assets.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['session-partial'])
  })

  it('emits a terminal ready status as the final progress event (P4.6 stuck-scan fix)', async () => {
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        options?.onProgress?.({ phase: 'deriving', current: 0, total: 1 })
        return { assets: [], stats: emptyStats, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = createRuntime(scanner)
    const statuses: string[] = []
    runtime.setProgressListener((payload) => statuses.push(payload.status.state))

    await runtime.refresh({ reason: 'startup', wait: true })

    // The channel must end on a terminal state, not a trailing scanning tick.
    expect(statuses.at(-1)).toBe('ready')
    expect(statuses).toContain('scanning')
  })

  it('emits a terminal error status through the progress channel when a scan fails (P4.6)', async () => {
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    vi.mocked(scanner.scanAll).mockRejectedValueOnce(new Error('boom'))
    const runtime = createRuntime(scanner)
    const statuses: string[] = []
    runtime.setProgressListener((payload) => statuses.push(payload.status.state))

    await runtime.refresh({ reason: 'startup', wait: true })

    expect(statuses.at(-1)).toBe('error')
  })

  it('discards a mid-flight scan whose project was switched away (no clobber) (GH-111 R4)', async () => {
    const deferred = createDeferred<ScanResult>()
    const scannerA: AssetRuntimeScanner = {
      scanAll: vi.fn(() => deferred.promise),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const scannerB = createScanner({ assets: [], stats: emptyStats, errors: [] })
    let calls = 0
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => (calls++ === 0 ? scannerA : scannerB),
      now: () => '2026-06-07T00:00:00.000Z',
      createSnapshotId: () => 'snapshot-old'
    })

    await runtime.refresh({ reason: 'startup' }) // starts scannerA scan (in-flight)
    runtime.setProjectDir('/other') // swaps to scannerB mid-scan

    const waitForOldScan = runtime.refresh({ wait: true })
    deferred.resolve({ assets: [sessionAsset('stale-asset')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    await waitForOldScan

    // The switched-away scan must not have committed its assets onto /other.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).not.toContain('stale-asset')
    expect(runtime.getStatus().state).not.toBe('ready')
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

  it('scopes search results to the active scope selection (user excludes project)', async () => {
    const skill = (id: string, scope: Asset['scope']): Asset => ({
      id,
      agentId: 'claude-code',
      category: 'instruction',
      type: 'skill',
      scope,
      name: id,
      path: `/x/${id}.md`,
      meta: {}
    })
    const scanner = createScanner({
      assets: [skill('alpha-user', 'user'), skill('alpha-project', 'project')],
      stats: emptyStats,
      errors: []
    })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })

    // Global (default): both match.
    const globalResults = await runtime.search('alpha')
    expect(globalResults.map((r) => r.asset.name).sort()).toEqual(['alpha-project', 'alpha-user'])

    // User scope: project asset is excluded without any rescan.
    runtime.setScopeSelection({ mode: 'user' })
    const userResults = await runtime.search('alpha')
    expect(userResults.map((r) => r.asset.name)).toEqual(['alpha-user'])
    expect(scanner.scanAll).toHaveBeenCalledTimes(1) // no rescan on scope change
  })

  it('filters cross-project sessions from project-mode search but keeps project assets visible', async () => {
    // GH-113 T2: sessions are the one asset type that is global-across-projects
    // in every per-project snapshot, so project-mode search must filter them to
    // the selected project (no leak). Project-scoped assets — including those
    // inherited from the repo root via the .git chain — must stay visible, since
    // a per-project snapshot already contains only the active project's chain.
    const session = (id: string, projectPath: string): Asset => ({
      id,
      agentId: 'codex',
      category: 'state',
      type: 'session',
      scope: 'session',
      name: id,
      path: `/tmp/${id}.jsonl`,
      meta: { projectPath }
    })
    const projectSkill: Asset = {
      id: 'review-skill',
      agentId: 'claude-code',
      category: 'instruction',
      type: 'skill',
      scope: 'project',
      name: 'review-skill',
      path: '/x/review-skill.md',
      meta: {}
    }
    const scanner = createScanner({
      assets: [session('review-berth', '/repo/berth'), session('review-other', '/repo/other'), projectSkill],
      stats: emptyStats,
      errors: []
    })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })

    // Global: both sessions and the project skill are searchable.
    const globalResults = await runtime.search('review')
    expect(globalResults.map((r) => r.asset.name).sort()).toEqual(['review-berth', 'review-other', 'review-skill'])

    // Project scope: the other project's session is filtered out; the active
    // project's session AND the project skill stay visible. No rescan.
    runtime.setScopeSelection({
      mode: 'project',
      projectPath: '/repo/berth',
      projectPathKey: normalizeProjectPathKey('/repo/berth')
    })
    const projectResults = await runtime.search('review')
    expect(projectResults.map((r) => r.asset.name).sort()).toEqual(['review-berth', 'review-skill'])
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
  })

  it('serves a cached snapshot when re-selecting a previously scanned project', async () => {
    const scanner = createScanner({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
    const cachedId = runtime.getSnapshot().id

    // Switching to an unscanned project has no cache.
    runtime.setProjectDir('/repo/other')
    expect(runtime.hasSnapshotFor('/repo/other')).toBe(false)
    expect(runtime.hasSnapshotFor('/repo/berth')).toBe(true)

    // Re-selecting the scanned project serves its snapshot instantly (no rescan).
    runtime.setProjectDir('/repo/berth')
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
    expect(runtime.getSnapshot().id).toBe(cachedId)
    expect(runtime.getStatus().state).toBe('ready')
  })
})
