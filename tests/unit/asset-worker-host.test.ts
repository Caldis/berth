import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import type { AssetStats } from '@shared/types/asset'
import type { AgentScanSourceGroup, AssetScanProgress, ScanResult } from '@shared/types/ipc'
import {
  AssetWorkerHost,
  type AssetWorkerMessage,
  WorkerAssetScanner,
  type AssetWorkerData,
  type WorkerLike
} from '../../src/main/engine/assets/worker-host'
import { createProjectScopeCandidate } from '@shared/scope'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
}

class FakeWorker extends EventEmitter implements WorkerLike {
  readonly workerData: AssetWorkerData

  constructor(workerData: AssetWorkerData) {
    super()
    this.workerData = workerData
  }

  send(message: AssetWorkerMessage): void {
    this.emit('message', message)
  }
}

function createHost(): {
  host: AssetWorkerHost
  workers: FakeWorker[]
} {
  const workers: FakeWorker[] = []
  return {
    workers,
    host: new AssetWorkerHost({
      createWorker: (workerData) => {
        const worker = new FakeWorker(workerData)
        workers.push(worker)
        return worker
      }
    })
  }
}

describe('AssetWorkerHost', () => {
  it('runs a scan job and forwards progress from the worker', async () => {
    const { host, workers } = createHost()
    const progress: AssetScanProgress[] = []
    const scanResult: ScanResult = { assets: [], stats: emptyStats, errors: [] }
    const sources: AgentScanSourceGroup[] = [{
      agentId: 'codex',
      agentName: 'Codex',
      installed: true,
      roots: [],
      sources: []
    }]

    const resultPromise = host.runScan({ projectDir: '/repo/berth' }, {
      onProgress: (event) => progress.push(event)
    })

    expect(workers[0]?.workerData).toEqual({ projectDir: '/repo/berth' })
    workers[0]?.send({
      type: 'progress',
      progress: { phase: 'parsing', current: 1, total: 3, label: 'sessions' }
    })
    workers[0]?.send({
      type: 'done',
      result: {
        projectDir: '/repo/berth',
        scanResult,
        sources,
        projectCandidates: [],
        sessionCache: { entries: [] }
      }
    })

    await expect(resultPromise).resolves.toEqual({
      projectDir: '/repo/berth',
      scanResult,
      sources,
      projectCandidates: [],
      sessionCache: { entries: [] }
    })
    expect(progress).toEqual([
      { phase: 'parsing', current: 1, total: 3, label: 'sessions' }
    ])
  })

  it('forwards cumulative partial assets from the worker (P4.6)', async () => {
    const { host, workers } = createHost()
    const partials: { assets: { id: string }[] }[] = []
    const scanResult: ScanResult = { assets: [], stats: emptyStats, errors: [] }

    const resultPromise = host.runScan({ projectDir: '/repo/berth' }, {
      onPartial: (partial) => partials.push({ assets: partial.assets.map((a) => ({ id: a.id })) })
    })

    workers[0]?.send({
      type: 'partial',
      partial: {
        assets: [{
          id: 'claude-skill',
          agentId: 'claude-code',
          category: 'instruction',
          type: 'skill',
          scope: 'user',
          name: 'claude-skill',
          path: '/x/SKILL.md',
          meta: {}
        }],
        stats: { ...emptyStats, skills: 1 }
      }
    })
    workers[0]?.send({
      type: 'done',
      result: {
        projectDir: '/repo/berth',
        scanResult,
        sources: [],
        projectCandidates: [],
        sessionCache: { entries: [] }
      }
    })

    await resultPromise
    expect(partials).toEqual([{ assets: [{ id: 'claude-skill' }] }])
  })

  it('rejects when the worker reports an error', async () => {
    const { host, workers } = createHost()
    const resultPromise = host.runScan({ projectDir: '/repo/berth' })

    workers[0]?.send({
      type: 'error',
      error: { message: 'scan failed' }
    })

    await expect(resultPromise).rejects.toThrow('scan failed')
  })

  it('rejects when the worker exits before sending a result', async () => {
    const { host, workers } = createHost()
    const resultPromise = host.runScan({ projectDir: '/repo/berth' })

    workers[0]?.emit('exit', 1)

    await expect(resultPromise).rejects.toThrow('Asset scan worker exited with code 1')
  })
})

describe('WorkerAssetScanner', () => {
  it('stores sources and candidates returned by the worker scan', async () => {
    const host = {
      runScan: vi.fn(async (_workerData: AssetWorkerData, callbacks?: { onProgress?: (progress: AssetScanProgress) => void }) => {
        callbacks?.onProgress?.({ phase: 'discovering', current: 0, total: 3 })
        return {
          projectDir: '/repo/berth',
          scanResult: { assets: [], stats: emptyStats, errors: [] },
          sources: [{
            agentId: 'claude-code',
            agentName: 'Claude Code',
            installed: true,
            roots: [],
            sources: []
          }],
          projectCandidates: [
            createProjectScopeCandidate({ path: '/repo/berth', source: 'current' })!
          ],
          sessionCache: { entries: [] }
        }
      })
    }
    const progress: AssetScanProgress[] = []
    const scanner = new WorkerAssetScanner('/repo/berth', { host })

    await expect(scanner.scanAll({ onProgress: (event) => progress.push(event) })).resolves.toEqual({
      assets: [],
      stats: emptyStats,
      errors: []
    })

    expect(progress).toEqual([{ phase: 'discovering', current: 0, total: 3 }])
    expect(scanner.getProjectDir()).toBe('/repo/berth')
    await expect(scanner.getScanSourceGroups()).resolves.toHaveLength(1)
    expect(scanner.getProjectScopeCandidates()[0]?.pathKey).toBe('/repo/berth')
  })
})
