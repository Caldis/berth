import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset, AssetStats } from '@shared/types/asset'
import type { AgentScanSourceGroup, AssetSnapshot, ScanResult } from '@shared/types/ipc'
import { AgentAssetRuntime, type AssetRuntimeScanner } from '@berth/scan-engine/engine/assets/runtime'
import { createProjectScopeCandidate, normalizeProjectPathKey } from '@shared/scope'
import { runHealthChecks } from '@berth/scan-engine/engine/health'
import { normalizeScanEngineSettings } from '@berth/scan-engine/engine/assets/settings'

// GH-113 T3: health is device-wide. Mock the checker so we can capture which assets
// it receives and prove scope selection never narrows them.
vi.mock('@berth/scan-engine/engine/health', () => ({ runHealthChecks: vi.fn(() => []) }))

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
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('reports scan engine info, indexed source files, and current controls', async () => {
    const skillA = fileAsset('skill-a', 'source-a', 'skill')
    const skillB = fileAsset('skill-b', 'source-a', 'skill')
    const session = sessionAsset('session-1')
    const scanner = createScanner({
      assets: [skillA, skillB, session],
      stats: { ...emptyStats, skills: 2, sessions: 1 },
      errors: [{ path: '/broken.json', type: 'parse', message: 'invalid json' }]
    })
    const runtime = createRuntime(scanner)

    await runtime.refresh({ reason: 'startup', wait: true })

    const info = runtime.getEngineInfo()
    expect(info.engine).toEqual({
      name: '@berth/scan-engine',
      packageName: '@berth/scan-engine',
      version: '0.1.0'
    })
    expect(info.status).toMatchObject({ state: 'ready', reason: 'startup', stale: false })
    expect(info.snapshot).toMatchObject({
      id: 'snapshot-1',
      indexedAssets: 3,
      indexedFiles: 2,
      errors: 1,
      sourceGroups: 1,
      sourceRows: 0
    })
    expect(info.capabilities).toMatchObject({
      workerMode: 'one-shot',
      schedulerMode: 'single-flight-queued-project-scope',
      scopeMode: 'scan-on-miss',
      cacheMode: 'sqlite-swr',
      incrementalFileChanges: true,
      pauseSupported: false,
      cancelSupported: false,
      writableSettingsSupported: true
    })
    expect(info.scheduler).toEqual({
      scanning: false,
      paused: false,
      scheduledRefresh: { active: false },
      queuedRefresh: { active: false },
      periodicScan: { enabled: true, intervalMs: 86_400_000 }
    })
    expect(info.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'manual-refresh', editable: false, supported: true }),
        expect.objectContaining({
          id: 'watcher-debounce-ms',
          value: 1000,
          unit: 'ms',
          editable: true,
          settingKey: 'watcherDebounceMs',
          min: 0,
          max: 10000,
          step: 100
        }),
        expect.objectContaining({
          id: 'watcher-min-interval-ms',
          value: 30000,
          unit: 'ms',
          editable: true,
          settingKey: 'watcherMinIntervalMs',
          min: 0,
          max: 300000,
          step: 1000
        }),
        expect.objectContaining({ id: 'scheduled-refresh', value: 'none', supported: true, editable: false }),
        expect.objectContaining({ id: 'queued-refresh', value: 'none', supported: true, editable: false }),
        expect.objectContaining({ id: 'pause', supported: false, editable: false })
      ])
    )
  })

  it('reports scheduled and queued refresh state through scan engine info', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'))

    const scheduledRuntime = createRuntime(createScanner({ assets: [], stats: emptyStats, errors: [] }))
    scheduledRuntime.scheduleRefresh({ reason: 'watcher', delayMs: 500, minIntervalMs: 0 })

    expect(scheduledRuntime.getEngineInfo().scheduler).toMatchObject({
      scanning: false,
      scheduledRefresh: {
        active: true,
        reason: 'watcher',
        delayMs: 500,
        scheduledAt: '2026-06-13T00:00:00.000Z',
        dueAt: '2026-06-13T00:00:00.500Z'
      },
      queuedRefresh: { active: false }
    })
    expect(scheduledRuntime.getEngineInfo().controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'scheduled-refresh', value: 'watcher' }),
        expect.objectContaining({ id: 'queued-refresh', value: 'none' })
      ])
    )

    const deferred = createDeferred<ScanResult>()
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(() => deferred.promise),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const queuedRuntime = createRuntime(scanner)

    await queuedRuntime.refresh({ reason: 'manual' })
    await queuedRuntime.refresh({ reason: 'project-scope' })

    expect(queuedRuntime.getEngineInfo().scheduler).toMatchObject({
      scanning: true,
      scheduledRefresh: { active: false },
      queuedRefresh: {
        active: true,
        reason: 'project-scope'
      }
    })
    expect(queuedRuntime.getEngineInfo().controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'scheduled-refresh', value: 'none' }),
        expect.objectContaining({ id: 'queued-refresh', value: 'project-scope' })
      ])
    )

    deferred.resolve({ assets: [], stats: emptyStats, errors: [] })
    await vi.runAllTimersAsync()
  })

  it('loads, normalizes, and persists scan engine settings', () => {
    const saved: unknown[] = []
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => createScanner({ assets: [], stats: emptyStats, errors: [] }),
      settingsStore: {
        load: () => ({ watcherDebounceMs: 1550, watcherMinIntervalMs: 90_400 }),
        save: (settings) => saved.push(settings)
      }
    })

    expect(runtime.getSettings()).toEqual(
      normalizeScanEngineSettings({ watcherDebounceMs: 1550, watcherMinIntervalMs: 90_400 })
    )
    runtime.setSettings({ watcherDebounceMs: 240 })
    const expectedSettings = normalizeScanEngineSettings({ watcherDebounceMs: 240, watcherMinIntervalMs: 90_400 })
    expect(runtime.getSettings()).toEqual(expectedSettings)
    expect(saved).toEqual([expectedSettings])
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

  it('coalesces high-frequency watcher fallback refreshes behind one scheduled scan (GH-129)', async () => {
    vi.useFakeTimers()
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })
    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })
    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })

    expect(scanner.scanAll).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(9)
    expect(scanner.scanAll).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
  })

  it('rate-limits watcher scheduled full refreshes after one has started (GH-129)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-13T00:00:00.000Z'))
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })
    await vi.advanceTimersByTimeAsync(10)
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)

    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })
    await vi.advanceTimersByTimeAsync(99)
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(scanner.scanAll).toHaveBeenCalledTimes(2)
  })

  it('uses editable scan engine settings for watcher scheduled refreshes', async () => {
    vi.useFakeTimers()
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)
    runtime.setSettings({ watcherDebounceMs: 200, watcherMinIntervalMs: 5000 })

    runtime.scheduleRefresh({ reason: 'watcher' })
    await vi.advanceTimersByTimeAsync(199)
    expect(scanner.scanAll).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
  })

  it('drops a pending scheduled refresh when the project generation changes (GH-129)', async () => {
    vi.useFakeTimers()
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    runtime.scheduleRefresh({ reason: 'watcher', delayMs: 10, minIntervalMs: 100 })
    runtime.setProjectDir('/repo/other')
    await vi.advanceTimersByTimeAsync(10)

    expect(scanner.scanAll).not.toHaveBeenCalled()
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

  it('queues a project-scope refresh when the current scan belongs to an older project', async () => {
    const deferred = createDeferred<ScanResult>()
    const scannerA: AssetRuntimeScanner = {
      scanAll: vi.fn(() => deferred.promise),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const scannerB = createScanner({
      assets: [sessionAsset('fresh-project')],
      stats: { ...emptyStats, sessions: 1 },
      errors: []
    })
    let calls = 0
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => (calls++ === 0 ? scannerA : scannerB),
      now: () => '2026-06-07T00:00:00.000Z',
      createSnapshotId: () => `snapshot-${calls}`
    })

    await runtime.refresh({ reason: 'startup' })
    runtime.setProjectDir('/other')
    await runtime.refresh({ reason: 'project-scope', wait: false })

    deferred.resolve({ assets: [sessionAsset('stale-asset')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    await vi.waitFor(() => {
      expect(scannerB.scanAll).toHaveBeenCalledTimes(1)
      expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['fresh-project'])
    })
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

  it('cold-starts from the persisted snapshot without scanning (GH-113 T1)', () => {
    const persisted: AssetSnapshot = {
      id: 'persisted',
      projectDir: '/repo/berth',
      assets: [skillAsset('cached')],
      stats: { ...emptyStats, skills: 1 },
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'ready', stale: false, lastCompletedAt: '2026-06-06T00:00:00.000Z' }
    }
    const store = { load: vi.fn(() => persisted), save: vi.fn() }
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-07T00:00:00.000Z',
      createSnapshotId: () => 'snap',
      snapshotStore: store
    })

    // Persisted data is served immediately, marked stale, with no scan triggered.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['cached'])
    expect(runtime.getStatus().state).toBe('stale')
    expect(runtime.getStatus().stale).toBe(true)
    expect(scanner.scanAll).not.toHaveBeenCalled()
  })

  it('persists the default-project snapshot on refresh complete, not other projects (GH-113 T1)', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn() }
    const scanner = createScanner({ assets: [skillAsset('fresh')], stats: { ...emptyStats, skills: 1 }, errors: [] })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-07T00:00:00.000Z',
      createSnapshotId: () => 'snap',
      snapshotStore: store
    })

    await runtime.refresh({ reason: 'startup', wait: true })
    expect(store.save).toHaveBeenCalledTimes(1)
    expect((store.save.mock.calls[0][0] as AssetSnapshot).assets.map((a) => a.id)).toEqual(['fresh'])
  })

  it('runs health checks over ALL assets regardless of scope — device-wide (GH-113 T3)', async () => {
    // Health surfaces system-level problems; scope-filtering would hide issues
    // outside the active project. So switching scope must NOT narrow the asset set
    // the checker sees. (Confirmed product decision; mirrors the rationale comment.)
    const hookAsset = (id: string, scope: Asset['scope']): Asset => ({
      id, agentId: 'claude-code', category: 'capability', type: 'hook', scope, name: id, path: `/x/${id}`, meta: {}
    })
    const scanner = createScanner({ assets: [hookAsset('u', 'user'), hookAsset('p', 'project')], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })

    await runtime.getHealthChecks()
    const seenGlobal = (vi.mocked(runHealthChecks).mock.calls.at(-1)![0] as { assets: Asset[] }).assets
    expect(seenGlobal.map((a) => a.id).sort()).toEqual(['p', 'u']) // every asset, not scope-filtered

    // Switch to project scope — the checker must STILL see every asset.
    runtime.setScopeSelection({ mode: 'project', projectPath: '/repo/berth', projectPathKey: normalizeProjectPathKey('/repo/berth') })
    await runtime.getHealthChecks()
    const seenProject = (vi.mocked(runHealthChecks).mock.calls.at(-1)![0] as { assets: Asset[] }).assets
    expect(seenProject.map((a) => a.id).sort()).toEqual(['p', 'u']) // unchanged — device-wide
  })
})

function skillAsset(id: string): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: 'instruction',
    type: 'skill',
    scope: 'user',
    name: id,
    path: `/x/${id}.md`,
    meta: {}
  }
}

// GH-113 I1: a single changed file's freshly-derived assets are folded into the
// live snapshot by sourceKey — no full rescan. These tests inject the derived
// assets directly (the derive-from-path logic is a separate slice).
function fileAsset(id: string, sourceKey: string, type: Asset['type'] = 'skill'): Asset {
  return {
    id,
    agentId: 'claude-code',
    category: type === 'command' ? 'instruction' : 'capability',
    type,
    scope: 'user',
    name: id,
    path: `/x/${id}`,
    meta: { sourceKey }
  }
}

async function readyRuntime(assets: Asset[], store?: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> }): Promise<AgentAssetRuntime> {
  const scanner = createScanner({ assets, stats: emptyStats, errors: [] })
  const runtime = new AgentAssetRuntime({
    projectDir: '/repo/berth',
    createScanner: () => scanner,
    now: () => '2026-06-07T00:00:00.000Z',
    createSnapshotId: () => 'ready-snap',
    snapshotStore: store
  })
  await runtime.refresh({ reason: 'startup', wait: true })
  return runtime
}

describe('AgentAssetRuntime.applyFileChange (GH-113 I1)', () => {
  it('replaces only the changed file’s assets and recomputes stats', async () => {
    const runtime = await readyRuntime([
      fileAsset('a-skill', 'key-a', 'skill'),
      fileAsset('b-cmd', 'key-b', 'command')
    ])
    runtime.applyFileChange('key-a', [fileAsset('a-skill-2', 'key-a', 'skill'), fileAsset('a-extra', 'key-a', 'skill')])

    const snap = runtime.getSnapshot()
    expect(snap.assets.map((x) => x.id).sort()).toEqual(['a-extra', 'a-skill-2', 'b-cmd'])
    expect(snap.stats.skills).toBe(2)
    expect(snap.stats.commands).toBe(1)
  })

  it('removes a file’s assets when it is deleted (empty derived set)', async () => {
    const runtime = await readyRuntime([fileAsset('a', 'key-a'), fileAsset('b', 'key-b')])
    runtime.applyFileChange('key-a', [])
    expect(runtime.getSnapshot().assets.map((x) => x.id)).toEqual(['b'])
  })

  it('adds assets for a newly-created file', async () => {
    const runtime = await readyRuntime([fileAsset('a', 'key-a')])
    runtime.applyFileChange('key-c', [fileAsset('c', 'key-c')])
    expect(runtime.getSnapshot().assets.map((x) => x.id).sort()).toEqual(['a', 'c'])
  })

  it('collapses cross-agent AGENTS.md via mergeSharedConventions', async () => {
    const agentsMd = (agentId: string): Asset => ({
      id: `agents-${agentId}`,
      agentId,
      category: 'instruction',
      type: 'agents-md',
      scope: 'project',
      name: 'AGENTS.md',
      path: '/repo/berth/AGENTS.md',
      meta: { sourceKey: 'key-agents', dedupeKey: 'key-agents', readByAgentIds: [agentId] }
    })
    const runtime = await readyRuntime([fileAsset('keep', 'key-keep')])
    runtime.applyFileChange('key-agents', [agentsMd('claude-code'), agentsMd('codex')])

    const agents = runtime.getSnapshot().assets.filter((x) => x.type === 'agents-md')
    expect(agents).toHaveLength(1) // collapsed to one canonical row
    expect(agents[0].meta.readByAgentIds).toEqual(expect.arrayContaining(['claude-code', 'codex']))
  })

  it('keeps the snapshot id stable and invalidates the selector cache', async () => {
    const runtime = await readyRuntime([fileAsset('a', 'key-a', 'skill')])
    const idBefore = runtime.getSnapshot().id
    const derive = vi.fn((assets: Asset[]) => assets.length)

    expect(runtime.select('count', (s) => derive(s.assets))).toBe(1)
    runtime.applyFileChange('key-a', [fileAsset('a', 'key-a', 'skill'), fileAsset('a2', 'key-a', 'skill')])

    expect(runtime.getSnapshot().id).toBe(idBefore) // stable id → id-keyed consumers don't re-fetch
    expect(runtime.select('count', (s) => derive(s.assets))).toBe(2) // cache cleared → re-derived
    expect(derive).toHaveBeenCalledTimes(2)
  })

  it('persists the updated snapshot and emits a partial to the listener', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn() }
    const runtime = await readyRuntime([fileAsset('a', 'key-a')], store)
    store.save.mockClear() // ignore the refresh-time save
    const partials: number[] = []
    runtime.setProgressListener((p) => { if (p.partial) partials.push(p.partial.assets.length) })

    runtime.applyFileChange('key-a', [fileAsset('a2', 'key-a')])

    expect(store.save).toHaveBeenCalledTimes(1)
    expect(partials).toEqual([1])
  })

  it('is a no-op when an untracked file yields no assets', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn() }
    const runtime = await readyRuntime([fileAsset('a', 'key-a')], store)
    store.save.mockClear()
    const partials: number[] = []
    runtime.setProgressListener((p) => { if (p.partial) partials.push(1) })

    runtime.applyFileChange('key-unknown', [])

    expect(store.save).not.toHaveBeenCalled()
    expect(partials).toHaveLength(0)
    expect(runtime.getSnapshot().assets.map((x) => x.id)).toEqual(['a'])
  })
})
