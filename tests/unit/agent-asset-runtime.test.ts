import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset, AssetStats } from '@shared/types/asset'
import type { AgentScanSourceGroup, AssetScanProgress, AssetSnapshot, ScanHistoryEntry, ScanResult } from '@shared/types/ipc'
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

// GH-140: a scanner whose scanAll never settles — models a slow full rescan, so a
// test that finishes proves ensureReady did NOT await it (SWR), and one that hangs
// proves it blocked.
function pendingScanner(): AssetRuntimeScanner {
  return {
    scanAll: vi.fn(() => new Promise<ScanResult>(() => {})),
    getScanSourceGroups: vi.fn(async () => []),
    getProjectScopeCandidates: vi.fn(() => []),
    getProjectDir: () => '/repo/berth'
  }
}

// GH-140: a runtime cold-started from a persisted snapshot — status 'stale', data
// already seeded, no scan run yet (mirrors restorePersistedSnapshot).
function staleRuntime(assets: Asset[], scanner: AssetRuntimeScanner): AgentAssetRuntime {
  const persisted: AssetSnapshot = {
    id: 'persisted',
    projectDir: '/repo/berth',
    assets,
    stats: emptyStats,
    errors: [],
    sources: [],
    projectCandidates: [],
    status: { state: 'ready', stale: false, lastCompletedAt: '2026-06-06T00:00:00.000Z' }
  }
  const store = { load: vi.fn(() => persisted), save: vi.fn(), clear: vi.fn() }
  return new AgentAssetRuntime({
    projectDir: '/repo/berth',
    createScanner: () => scanner,
    now: () => '2026-06-07T00:00:00.000Z',
    createSnapshotId: () => 'snapshot-swr',
    snapshotStore: store
  })
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
      pauseSupported: true,
      cancelSupported: true,
      writableSettingsSupported: true
    })
    expect(info.scheduler).toEqual({
      scanning: false,
      paused: false,
      scheduledRefresh: { active: false },
      queuedRefresh: { active: false },
      periodicScan: { enabled: true, intervalMs: 86_400_000 },
      lastScanDurationMs: expect.any(Number)
    })
    expect(info.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'source-groups', editable: false, supported: true }),
        expect.objectContaining({ id: 'last-scan-reason', editable: false, supported: true }),
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
        expect.objectContaining({ id: 'pause', supported: true, editable: false })
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
    // Editing a raw value flips the preset to 'custom' (GH-135 E3).
    const expectedSettings = normalizeScanEngineSettings({ watcherDebounceMs: 240, watcherMinIntervalMs: 90_400, preset: 'custom' })
    expect(runtime.getSettings()).toEqual(expectedSettings)
    expect(saved).toEqual([expectedSettings])
  })

  it('queues a wait:true refresh arriving mid-scan and resolves after ITS scan commits (GH-151 S4)', async () => {
    // Semantics change (GH-151): a refresh landing mid-scan no longer merely
    // joins the in-flight scan — it queues (latest-wins) and its waiter resolves
    // only once a scan that STARTED at-or-after the request has committed. The
    // old join shortcut was the mechanism behind the rebuild dead zone.
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

    // Still single-flight while the first scan runs.
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)
    deferred.resolve({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })

    await expect(waitForScan).resolves.toMatchObject({
      state: 'ready',
      reason: 'manual',
      stale: false
    })
    // The queued manual refresh ran as a second scan and minted a second snapshot.
    expect(scanner.scanAll).toHaveBeenCalledTimes(2)
    expect(runtime.getSnapshot()).toMatchObject({
      id: 'snapshot-2',
      assets: [sessionAsset('session-1')],
      stats: { ...emptyStats, sessions: 1 },
      status: { state: 'ready', reason: 'manual', stale: false }
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

  it('folds existing shallow assets into a deep-only partial engine-side (GH-135 flicker fix moved from store)', async () => {
    const shallow: Asset = {
      ...fileAsset('shallow-conv', 'k-shallow', 'claude-md'),
      scope: 'project',
      meta: { sourceKey: 'k-shallow', scanDepth: 'shallow', projectPath: '/other' }
    }
    const persisted: AssetSnapshot = {
      id: 'persisted',
      projectDir: '/repo/berth',
      assets: [shallow],
      stats: emptyStats,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'ready', stale: false }
    }
    const scanner: AssetRuntimeScanner = {
      // The scanner streams a deep-only partial; shallow lands only in the final snapshot.
      scanAll: vi.fn(async (options) => {
        options?.onPartial?.({ assets: [skillAsset('deep-live')], stats: { ...emptyStats, skills: 1 } })
        return { assets: [skillAsset('deep-live')], stats: { ...emptyStats, skills: 1 }, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-07T00:00:00.000Z',
      snapshotStore: { load: () => persisted, save: vi.fn(), clear: vi.fn() }
    })
    const partialIds: string[][] = []
    runtime.setProgressListener((payload) => {
      if (payload.partial) partialIds.push(payload.partial.assets.map((a) => a.id).sort())
    })

    await runtime.refresh({ reason: 'manual', wait: true })

    // The deep-only partial was folded with the existing shallow before reaching the listener.
    expect(partialIds.some((ids) => ids.includes('deep-live') && ids.includes('shallow-conv'))).toBe(true)
  })

  it('keeps the committed index size steady during a rescan instead of flickering 0→N (GH-135 G1)', async () => {
    const persisted: AssetSnapshot = {
      id: 'persisted',
      projectDir: '/repo/berth',
      assets: [skillAsset('a'), skillAsset('b'), skillAsset('c')],
      stats: { ...emptyStats, skills: 3 },
      errors: [],
      sources: [],
      projectCandidates: [],
      status: { state: 'ready', stale: false }
    }
    let midScanAssets = -1
    let runtime!: AgentAssetRuntime
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        // A single deep partial lands mid-rebuild — the panel metric must NOT drop to 1.
        options?.onPartial?.({ assets: [skillAsset('a')], stats: { ...emptyStats, skills: 1 } })
        midScanAssets = runtime.getEngineInfo().snapshot.indexedAssets
        return {
          assets: [skillAsset('a'), skillAsset('b'), skillAsset('c'), skillAsset('d')],
          stats: { ...emptyStats, skills: 4 },
          errors: []
        }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      snapshotStore: { load: () => persisted, save: vi.fn(), clear: vi.fn() }
    })

    await runtime.refresh({ reason: 'manual', wait: true })

    // Mid-scan the metric holds at the committed 3, not the partial's 1.
    expect(midScanAssets).toBe(3)
    // After commit it updates to the fresh count.
    expect(runtime.getEngineInfo().snapshot.indexedAssets).toBe(4)
  })

  it('still grows the index size progressively on the first build (no committed baseline) (GH-135 G1)', async () => {
    let midScanAssets = -1
    let runtime!: AgentAssetRuntime
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        options?.onPartial?.({ assets: [skillAsset('a'), skillAsset('b')], stats: { ...emptyStats, skills: 2 } })
        midScanAssets = runtime.getEngineInfo().snapshot.indexedAssets
        return { assets: [skillAsset('a'), skillAsset('b')], stats: { ...emptyStats, skills: 2 }, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      snapshotStore: { load: () => null, save: vi.fn(), clear: vi.fn() }
    })

    await runtime.refresh({ reason: 'manual', wait: true })

    // No committed baseline → the live partial drives the count (progressive growth).
    expect(midScanAssets).toBe(2)
  })

  it('records scan history on completion and persists it (GH-135 G7)', async () => {
    const saved: ScanHistoryEntry[][] = []
    const scanner = createScanner({
      assets: [skillAsset('a'), skillAsset('b')],
      stats: { ...emptyStats, skills: 2 },
      errors: []
    })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-16T10:00:00.000Z',
      snapshotStore: {
        load: () => null,
        save: vi.fn(),
        clear: vi.fn(),
        loadScanHistory: () => [],
        saveScanHistory: (entries: ScanHistoryEntry[]) => saved.push(entries)
      }
    })

    await runtime.refresh({ reason: 'manual', wait: true })

    const history = runtime.getEngineInfo().scanHistory
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ reason: 'manual', assetCount: 2, ok: true })
    // The bounded list was persisted through the store.
    expect(saved.at(-1)).toHaveLength(1)
  })

  it('restores persisted scan history on cold start (GH-135 G7)', () => {
    const persisted: ScanHistoryEntry[] = [
      { at: '2026-06-15T00:00:00.000Z', reason: 'startup', durationMs: 1000, assetCount: 5, fileCount: 5, errorCount: 0, ok: true, sourceCount: 2 }
    ]
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => createScanner({ assets: [], stats: emptyStats, errors: [] }),
      snapshotStore: {
        load: () => null,
        save: vi.fn(),
        clear: vi.fn(),
        loadScanHistory: () => persisted,
        saveScanHistory: vi.fn()
      }
    })

    expect(runtime.getEngineInfo().scanHistory).toEqual(persisted)
  })

  it('enriches progress with scanned count + elapsed time engine-side (GH-135 single source of truth)', async () => {
    let nowMs = 10_000
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        nowMs += 2_000 // 2s elapsed since the scan started
        options?.onPartial?.({ assets: [skillAsset('s1'), skillAsset('s2')], stats: { ...emptyStats, skills: 2 } })
        options?.onProgress?.({ phase: 'parsing', current: 1, total: 2 })
        return { assets: [skillAsset('s1'), skillAsset('s2')], stats: { ...emptyStats, skills: 2 }, errors: [] }
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth'
    }
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => new Date(nowMs).toISOString()
    })
    const ticks: AssetScanProgress[] = []
    runtime.setProgressListener((payload) => {
      if (payload.status.progress) ticks.push(payload.status.progress)
    })

    await runtime.refresh({ reason: 'startup', wait: true })

    // The onProgress tick fired after the 2-asset partial at +2s elapsed.
    const enriched = ticks.find((p) => p.scannedAssets === 2)
    expect(enriched).toBeDefined()
    expect(enriched?.elapsedMs).toBeGreaterThanOrEqual(2_000)
    expect(enriched?.ratePerSec).toBeGreaterThan(0)
  })

  it('cancel kills the in-flight scan, keeps already-scanned assets, and goes stale (GH-135)', async () => {
    const deferred = createDeferred<ScanResult>()
    const cancelSpy = vi.fn()
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(async (options) => {
        options?.onPartial?.({ assets: [skillAsset('partial-1')], stats: { ...emptyStats, skills: 1 } })
        return deferred.promise
      }),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth',
      cancel: cancelSpy
    }
    const runtime = createRuntime(scanner)
    void runtime.refresh({ reason: 'startup' })
    await vi.waitFor(() => expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['partial-1']))

    runtime.cancel()

    expect(cancelSpy).toHaveBeenCalled()
    expect(runtime.getStatus().state).toBe('stale')
    // Already-scanned assets survive the cancel.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['partial-1'])
    // A late resolution of the aborted scan must not commit (dropped by the coordinator).
    deferred.resolve({ assets: [skillAsset('late')], stats: { ...emptyStats, skills: 1 }, errors: [] })
    await Promise.resolve()
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['partial-1'])
  })

  it('pause stops scheduling and cancels the in-flight scan (GH-135)', async () => {
    const deferred = createDeferred<ScanResult>()
    const scanner: AssetRuntimeScanner = {
      scanAll: vi.fn(() => deferred.promise),
      getScanSourceGroups: vi.fn(async () => []),
      getProjectScopeCandidates: vi.fn(() => []),
      getProjectDir: () => '/repo/berth',
      cancel: vi.fn()
    }
    const runtime = createRuntime(scanner)
    void runtime.refresh({ reason: 'startup' })
    await vi.waitFor(() => expect(runtime.getStatus().state).toBe('scanning'))

    runtime.pause()

    expect(runtime.getEngineInfo().scheduler.paused).toBe(true)
    expect(runtime.getStatus().state).toBe('stale')
    deferred.resolve({ assets: [], stats: emptyStats, errors: [] })
  })

  it('rebuild clears the persisted + in-memory index then rescans (GH-135)', async () => {
    const clearSpy = vi.fn()
    const scanner = createScanner({ assets: [skillAsset('fresh')], stats: { ...emptyStats, skills: 1 }, errors: [] })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-07T00:00:00.000Z',
      snapshotStore: { load: () => null, save: vi.fn(), clear: clearSpy }
    })
    await runtime.refresh({ reason: 'startup', wait: true })
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['fresh'])

    await runtime.rebuild({ wait: true })

    expect(clearSpy).toHaveBeenCalled()
    // A full rescan repopulated the index from scratch.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['fresh'])
  })

  it('periodic scheduler runs a rescan after the interval; idle/battery gating defers it (GH-135 B3)', async () => {
    vi.useFakeTimers()
    let onBattery = false
    const scanner = createScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      settingsStore: {
        load: () => ({ periodicScanIntervalMs: 3_600_000, idleOnly: true, idleThresholdMs: 60_000, acOnlyFullScan: true }),
        save: vi.fn()
      },
      powerMonitor: { getSystemIdleTimeMs: () => 999_999, onBatteryPower: () => onBattery }
    })

    // On battery → the periodic scan defers (re-arms) without scanning.
    onBattery = true
    runtime.schedulePeriodic()
    expect(runtime.getEngineInfo().scheduler.periodicScan.nextScanAt).toBeDefined()
    await vi.advanceTimersByTimeAsync(3_600_000)
    expect(scanner.scanAll).not.toHaveBeenCalled()

    // Idle + back on AC → the periodic rescan runs.
    onBattery = false
    await vi.advanceTimersByTimeAsync(3_600_000)
    expect(scanner.scanAll).toHaveBeenCalled()

    vi.useRealTimers()
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

    const waitForScan = runtime.refresh({ wait: true })
    deferred.resolve({ assets: [sessionAsset('stale-asset')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    await waitForScan

    // The switched-away scan must not have committed its assets onto /other. The
    // queued wait:true refresh (GH-151 S4) reran against scannerB, so the ready
    // snapshot belongs to the CURRENT generation — clobber-free either way.
    expect(runtime.getSnapshot().assets.map((a) => a.id)).not.toContain('stale-asset')
    expect(scannerB.scanAll).toHaveBeenCalledTimes(1)
    expect(runtime.getSnapshot().assets).toEqual([])
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
    const store = { load: vi.fn(() => persisted), save: vi.fn(), clear: vi.fn() }
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

  it('GH-140: ensureReady serves the stale persisted snapshot immediately and refreshes in the background', async () => {
    const scanner = pendingScanner()
    const runtime = staleRuntime([skillAsset('cached')], scanner)
    expect(runtime.getStatus().state).toBe('stale')

    // Must resolve WITHOUT awaiting the never-resolving rescan — SWR, not a block.
    const snapshot = await runtime.ensureReady({ reason: 'manual' })

    expect(snapshot.assets.map((a) => a.id)).toEqual(['cached']) // old data served immediately
    expect(scanner.scanAll).toHaveBeenCalledTimes(1) // background refresh kicked off
    expect(runtime.getStatus().state).toBe('scanning') // rescan now in flight
  }, 1000)

  it('GH-140: listSessions serves stale sessions immediately without blocking on the rescan', async () => {
    const scanner = pendingScanner()
    const runtime = staleRuntime([sessionAsset('s1'), sessionAsset('s2')], scanner)

    const result = await runtime.listSessions({})

    expect(result.sessions).toHaveLength(2) // served from the stale snapshot
    expect(scanner.scanAll).toHaveBeenCalledTimes(1) // background refresh kicked off
  }, 1000)

  it('GH-140: ensureReady does not re-block when a scan is already in flight and a snapshot exists', async () => {
    const scanner = pendingScanner()
    const runtime = staleRuntime([skillAsset('cached')], scanner)
    void runtime.refresh({ reason: 'manual', wait: false }) // scan already in flight
    expect(runtime.getStatus().state).toBe('scanning')

    const snapshot = await runtime.ensureReady({ reason: 'manual' })

    expect(snapshot.assets.map((a) => a.id)).toEqual(['cached'])
    expect(scanner.scanAll).toHaveBeenCalledTimes(1) // single-flight: no duplicate scan
  }, 1000)

  it('GH-140: ensureReady still awaits the first scan when there is no persisted snapshot', async () => {
    const scanner = createScanner({ assets: [skillAsset('fresh')], stats: { ...emptyStats, skills: 1 }, errors: [] })
    const runtime = createRuntime(scanner)
    expect(runtime.getStatus().state).toBe('idle')

    const snapshot = await runtime.ensureReady({ reason: 'manual' })

    expect(snapshot.assets.map((a) => a.id)).toEqual(['fresh']) // awaited the first scan (no data otherwise)
    expect(snapshot.status.state).toBe('ready')
  })

  it('GH-140: ensureReady({ refresh: true }) still awaits a fresh scan even with a ready snapshot', async () => {
    const scanner = createScanner({ assets: [skillAsset('x')], stats: { ...emptyStats, skills: 1 }, errors: [] })
    const runtime = createRuntime(scanner)
    await runtime.refresh({ reason: 'startup', wait: true })
    expect(scanner.scanAll).toHaveBeenCalledTimes(1)

    await runtime.ensureReady({ refresh: true })

    expect(scanner.scanAll).toHaveBeenCalledTimes(2) // forced rescan awaited
  })

  it('persists the default-project snapshot on refresh complete, not other projects (GH-113 T1)', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn(), clear: vi.fn() }
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

async function readyRuntime(assets: Asset[], store?: { load: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn>; replaceBySourceKey?: ReturnType<typeof vi.fn> }): Promise<AgentAssetRuntime> {
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

describe('AgentAssetRuntime refresh queueing (GH-151 S4)', () => {
  function deferredScanner(second: ScanResult): {
    scanner: AssetRuntimeScanner
    first: ReturnType<typeof createDeferred<ScanResult>>
    scanAll: ReturnType<typeof vi.fn>
  } {
    const first = createDeferred<ScanResult>()
    const scanAll = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async () => second)
    return {
      first,
      scanAll,
      scanner: {
        scanAll,
        getScanSourceGroups: vi.fn(async () => []),
        getProjectScopeCandidates: vi.fn(() => []),
        getProjectDir: () => '/repo/berth',
        cancel: vi.fn()
      }
    }
  }

  it('queues a watcher refresh arriving mid-scan and flushes it after the scan settles', async () => {
    // Pre-fix: any non-project-scope refresh during a scan was silently dropped,
    // so a watcher change landing in the 30s-1min scan window stayed invisible
    // until the 24h periodic rescan.
    const { scanner, first, scanAll } = deferredScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    void runtime.refresh({ reason: 'manual' })
    expect(scanAll).toHaveBeenCalledTimes(1)
    void runtime.refresh({ reason: 'watcher' })

    first.resolve({ assets: [], stats: emptyStats, errors: [] })
    await vi.waitFor(() => expect(scanAll).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(runtime.getStatus().state).toBe('ready'))
  })

  it('rebuild during an in-flight scan clears the index AND still rescans (dead-zone fix)', async () => {
    // Pre-fix: rebuild() cancelled the scan then called refresh() synchronously;
    // inFlight had not settled yet, 'manual' was not queueable → the rescan was
    // dropped 100% of the time and the app sat on an empty initial snapshot.
    const clearSpy = vi.fn()
    const { scanner, first, scanAll } = deferredScanner({
      assets: [skillAsset('post-rebuild')],
      stats: { ...emptyStats, skills: 1 },
      errors: []
    })
    const runtime = new AgentAssetRuntime({
      projectDir: '/repo/berth',
      createScanner: () => scanner,
      now: () => '2026-06-07T00:00:00.000Z',
      snapshotStore: { load: () => null, save: vi.fn(), clear: clearSpy }
    })

    void runtime.refresh({ reason: 'manual' })
    const rebuilt = runtime.rebuild({ wait: true })
    expect(clearSpy).toHaveBeenCalled()

    // The killed helper's promise rejects (kill → exit) — the coordinator drops
    // it as cancelled, then the queued rebuild refresh must run.
    first.reject(new Error('helper killed'))
    await rebuilt

    expect(scanAll).toHaveBeenCalledTimes(2)
    expect(runtime.getStatus().state).toBe('ready')
    expect(runtime.getSnapshot().assets.map((a) => a.id)).toEqual(['post-rebuild'])
  })

  it('cancel drops the queued refresh and resolves waiters instead of hanging', async () => {
    const { scanner, first, scanAll } = deferredScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    void runtime.refresh({ reason: 'manual' })
    const waited = runtime.refresh({ reason: 'watcher', wait: true })
    runtime.cancel()

    // The waiter must settle (an IPC caller would otherwise hang forever).
    await waited
    first.reject(new Error('helper killed'))
    await Promise.resolve()

    // Cancel means "stop and stay stopped": the queued watcher refresh is gone.
    expect(scanAll).toHaveBeenCalledTimes(1)
    expect(runtime.getStatus().state).toBe('stale')
  })

  it('derived reads during the first index build JOIN the startup scan — no redundant second scan', async () => {
    // ensureReady's initial-blocking path must not queue: UI derived reads fire
    // in bursts while the startup scan runs, and each queued one would trigger a
    // redundant full rescan after commit (caught by incremental-watch.e2e.ts —
    // the snapshot id churned right after the first commit).
    const { scanner, first, scanAll } = deferredScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    void runtime.refresh({ reason: 'startup' })
    const read1 = runtime.listSessions({})
    const read2 = runtime.getHealthChecks()

    first.resolve({ assets: [sessionAsset('session-1')], stats: { ...emptyStats, sessions: 1 }, errors: [] })
    await Promise.all([read1, read2])

    await vi.waitFor(() => expect(runtime.getStatus().state).toBe('ready'))
    expect(scanAll).toHaveBeenCalledTimes(1)
    expect(runtime.getSnapshot().id).toBe('snapshot-1')
  })

  it('pause drops the queued refresh — nothing auto-flushes while paused', async () => {
    const { scanner, first, scanAll } = deferredScanner({ assets: [], stats: emptyStats, errors: [] })
    const runtime = createRuntime(scanner)

    void runtime.refresh({ reason: 'manual' })
    void runtime.refresh({ reason: 'watcher' })
    runtime.pause()

    first.reject(new Error('helper killed'))
    await Promise.resolve()
    await Promise.resolve()

    expect(scanAll).toHaveBeenCalledTimes(1)
    expect(runtime.getEngineInfo().scheduler.paused).toBe(true)
  })
})

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
    // Store WITHOUT replaceBySourceKey — the incremental persist falls back to a
    // full save() so alternate backends need no change (GH-151 S5).
    const store = { load: vi.fn(() => null), save: vi.fn(), clear: vi.fn() }
    const runtime = await readyRuntime([fileAsset('a', 'key-a')], store)
    store.save.mockClear() // ignore the refresh-time save
    const partials: number[] = []
    runtime.setProgressListener((p) => { if (p.partial) partials.push(p.partial.assets.length) })

    runtime.applyFileChange('key-a', [fileAsset('a2', 'key-a')])

    expect(store.save).toHaveBeenCalledTimes(1)
    expect(partials).toEqual([1])
  })

  it('persists incrementally via replaceBySourceKey when the store supports it (GH-151 S5)', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn(), clear: vi.fn(), replaceBySourceKey: vi.fn() }
    const runtime = await readyRuntime([fileAsset('a', 'key-a'), fileAsset('b', 'key-b')], store)
    store.save.mockClear() // ignore the refresh-time full save

    runtime.applyFileChange('key-a', [fileAsset('a2', 'key-a')])

    // Row-level replacement carries exactly the post-merge assets of that file,
    // never the whole table.
    expect(store.save).not.toHaveBeenCalled()
    expect(store.replaceBySourceKey).toHaveBeenCalledTimes(1)
    const [key, rows, envelope] = store.replaceBySourceKey.mock.calls[0]
    expect(key).toBe('key-a')
    expect((rows as Asset[]).map((x) => x.id)).toEqual(['a2'])
    expect((envelope as AssetSnapshot).assets.map((x) => x.id)).toEqual(['b', 'a2'])
  })

  it('is a no-op when an untracked file yields no assets', async () => {
    const store = { load: vi.fn(() => null), save: vi.fn(), clear: vi.fn() }
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
