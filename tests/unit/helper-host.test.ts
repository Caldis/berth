import { EventEmitter } from 'events'
import { describe, expect, it, vi } from 'vitest'
import type { UtilityProcess } from 'electron'
import type { AssetStats } from '@shared/types/asset'
import type { AgentScanSourceGroup, ScanResult } from '@shared/types/ipc'
import type { AssetWorkerMessage } from '@berth/scan-engine/engine/assets/worker-host'

// helper-host imports `utilityProcess` from electron at module load; the node test
// host has no electron binary, so mock it. Tests inject createChild and never call
// the real fork.
vi.mock('electron', () => ({ utilityProcess: { fork: vi.fn() } }))

import { HelperAssetScanner, ScanHelperHost } from '../../src/main/helper-host'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0
}

class FakeChild extends EventEmitter {
  postMessage = vi.fn()
  kill = vi.fn(() => true)
  pid = 4242
  send(message: AssetWorkerMessage | { type: string; result?: unknown }): void {
    this.emit('message', message)
  }
}

function asChild(c: FakeChild): UtilityProcess {
  return c as unknown as UtilityProcess
}

const donePayload = {
  projectDir: '/repo/berth',
  scanResult: { assets: [], stats: emptyStats, errors: [] } as ScanResult,
  sources: [] as AgentScanSourceGroup[],
  projectCandidates: [],
  sessionCache: { entries: [] },
  projectScanCache: { entries: [] }
}

describe('ScanHelperHost (GH-135)', () => {
  it('forks, awaits spawn, sends the scan command, forwards progress, resolves on done', async () => {
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })
    const progress: unknown[] = []

    const result = host.runScan({ projectDir: '/repo/berth' }, { onProgress: (p) => progress.push(p) })
    // Host awaits 'spawn' before posting — nothing sent yet.
    expect(child.postMessage).not.toHaveBeenCalled()

    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(1))
    expect(child.postMessage).toHaveBeenCalledWith({
      type: 'scan',
      data: { projectDir: '/repo/berth' }
    })

    child.send({ type: 'progress', progress: { phase: 'parsing', current: 1, total: 2, label: 'x' } })
    child.send({ type: 'done', result: donePayload })

    await expect(result).resolves.toEqual(donePayload)
    expect(progress).toEqual([{ phase: 'parsing', current: 1, total: 2, label: 'x' }])
  })

  it('reuses the long-lived child across scans (no re-fork)', async () => {
    const child = new FakeChild()
    const forks = vi.fn(() => asChild(child))
    const host = new ScanHelperHost({ createChild: forks })

    const r1 = host.runScan({ projectDir: '/a' })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(1))
    child.send({ type: 'done', result: donePayload })
    await r1

    const r2 = host.runScan({ projectDir: '/a' })
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(2))
    child.send({ type: 'done', result: donePayload })
    await r2

    expect(forks).toHaveBeenCalledTimes(1) // long-lived: forked once, reused
  })

  it('rejects on helper error', async () => {
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })
    const result = host.runScan({ projectDir: '/a' })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalled())
    child.send({ type: 'error', error: { message: 'scan blew up' } })
    await expect(result).rejects.toThrow('scan blew up')
  })

  it('rejects when the child exits before ever spawning (GH-151 S2)', async () => {
    // utilityProcess can die without a 'spawn' event (missing helper script,
    // resource exhaustion). Pre-fix the spawn promise never settled and the scan
    // hung forever with no cancel escape.
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })

    const r = host.runScan({ projectDir: '/a' })
    child.emit('exit', 127) // no 'spawn' ever

    await expect(r).rejects.toThrow(/exited/)
  })

  it('kills a wedged helper after the inactivity window, messages reset it (GH-151 S2)', async () => {
    vi.useFakeTimers()
    try {
      const child = new FakeChild()
      const host = new ScanHelperHost({ createChild: () => asChild(child), inactivityTimeoutMs: 1000 })

      const r = host.runScan({ projectDir: '/a' })
      const rejection = expect(r).rejects.toThrow(/no message/) // attach before it fires
      child.emit('spawn')
      await vi.advanceTimersByTimeAsync(999)

      // A message inside the window resets the watchdog — slow-but-alive scans
      // must not be killed.
      child.send({ type: 'progress', progress: { phase: 'parsing', current: 1, total: 9, label: 'x' } })
      await vi.advanceTimersByTimeAsync(999)
      expect(child.kill).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(2)
      expect(child.kill).toHaveBeenCalled()
      await rejection
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects on premature exit and respawns on the next scan', async () => {
    const child1 = new FakeChild()
    const child2 = new FakeChild()
    const children = [child1, child2]
    const host = new ScanHelperHost({ createChild: () => asChild(children.shift()!) })

    const r1 = host.runScan({ projectDir: '/a' })
    child1.emit('spawn')
    await vi.waitFor(() => expect(child1.postMessage).toHaveBeenCalled())
    child1.emit('exit', 1)
    await expect(r1).rejects.toThrow('exited with code 1')

    // Next scan respawns (child1 was dropped on exit).
    const r2 = host.runScan({ projectDir: '/a' })
    child2.emit('spawn')
    await vi.waitFor(() => expect(child2.postMessage).toHaveBeenCalled())
    child2.send({ type: 'done', result: donePayload })
    await expect(r2).resolves.toEqual(donePayload)
  })

  it('kill() terminates the child and clears the pid', async () => {
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })
    const r = host.runScan({ projectDir: '/a' })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalled())

    expect(host.pid()).toBe(4242)
    host.kill()
    expect(child.kill).toHaveBeenCalled()
    expect(host.pid()).toBeUndefined()

    // Settle the dangling scan promise to avoid an unhandled rejection.
    child.send({ type: 'done', result: donePayload })
    await r.catch(() => undefined)
  })

  it('forwards every scan option to the helper payload (GH-151 S1)', async () => {
    // Guards the production chain against option drops: the packaged app scans
    // through HelperAssetScanner, so a field missing here (respectGitignore was)
    // silently disables the feature only in production.
    const runScan = vi.fn(async () => donePayload)
    const scanner = new HelperAssetScanner('/repo/berth', {
      runScan,
      runProjectDeepScan: vi.fn(),
      kill: vi.fn()
    } as never)

    await scanner.scanAll({ batchPauseMs: 25, excludePaths: ['/skip'], respectGitignore: true })

    expect(runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        projectDir: '/repo/berth',
        batchPauseMs: 25,
        excludePaths: ['/skip'],
        respectGitignore: true
      }),
      expect.anything()
    )
  })

  it('applies OS throttle to the helper pid on spawn', async () => {
    const child = new FakeChild()
    const applyThrottle = vi.fn()
    const host = new ScanHelperHost({ createChild: () => asChild(child), applyThrottle })
    const r = host.runScan({ projectDir: '/a' })
    child.emit('spawn')
    await vi.waitFor(() => expect(applyThrottle).toHaveBeenCalledWith(4242))
    child.send({ type: 'done', result: donePayload })
    await r
  })

  it('skips throttle when osThrottle is disabled', async () => {
    const child = new FakeChild()
    const applyThrottle = vi.fn()
    const host = new ScanHelperHost({ createChild: () => asChild(child), applyThrottle, osThrottle: false })
    const r = host.runScan({ projectDir: '/a' })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalled())
    expect(applyThrottle).not.toHaveBeenCalled()
    child.send({ type: 'done', result: donePayload })
    await r
  })
})

describe('ScanHelperHost project deep scan (GH-155 C3)', () => {
  const deepPayload = { assets: [], errors: [], projectScanCache: { entries: [] } }

  it('sends scan-project-deep and resolves on project-deep-done', async () => {
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })
    const r = host.runProjectDeepScan({ projectRoot: '/repo/p', respectGitignore: true })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(1))
    expect(child.postMessage).toHaveBeenCalledWith({
      type: 'scan-project-deep',
      data: { projectRoot: '/repo/p', respectGitignore: true }
    })
    child.send({ type: 'project-deep-done', result: deepPayload })
    await expect(r).resolves.toEqual(deepPayload)
  })

  it('serializes concurrent requests on the single child — no message interleave (C3 互斥)', async () => {
    const child = new FakeChild()
    const host = new ScanHelperHost({ createChild: () => asChild(child) })
    const r1 = host.runScan({ projectDir: '/a' })
    const r2 = host.runProjectDeepScan({ projectRoot: '/b' })
    child.emit('spawn')
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(1))
    expect(child.postMessage).toHaveBeenNthCalledWith(1, { type: 'scan', data: { projectDir: '/a' } })

    // The queued deep scan must not be posted while the full scan is in flight.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(child.postMessage).toHaveBeenCalledTimes(1)

    child.send({ type: 'done', result: donePayload })
    await r1
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(2))
    expect(child.postMessage).toHaveBeenNthCalledWith(2, { type: 'scan-project-deep', data: { projectRoot: '/b' } })
    child.send({ type: 'project-deep-done', result: deepPayload })
    await expect(r2).resolves.toEqual(deepPayload)
  })

  it('deep-scan child error rejects; a later request respawns after exit', async () => {
    const child1 = new FakeChild()
    const child2 = new FakeChild()
    const children = [child1, child2]
    const host = new ScanHelperHost({ createChild: () => asChild(children.shift()!) })

    const r1 = host.runProjectDeepScan({ projectRoot: '/p' })
    child1.emit('spawn')
    await vi.waitFor(() => expect(child1.postMessage).toHaveBeenCalled())
    child1.send({ type: 'error', error: { message: 'deep blew up' } })
    await expect(r1).rejects.toThrow('deep blew up')

    child1.emit('exit', 1)
    const r2 = host.runProjectDeepScan({ projectRoot: '/p' })
    child2.emit('spawn')
    await vi.waitFor(() => expect(child2.postMessage).toHaveBeenCalled())
    child2.send({ type: 'project-deep-done', result: deepPayload })
    await expect(r2).resolves.toEqual(deepPayload)
  })

  it('HelperAssetScanner.scanProjectDeep forwards options and round-trips the cache snapshot', async () => {
    const returnedCache = { entries: [{ fingerprint: { path: '/p/SKILL.md', size: 1, mtimeMs: 2 }, value: [] }] }
    const runProjectDeepScan = vi.fn(async () => ({ assets: [], errors: [], projectScanCache: returnedCache }))
    const scanner = new HelperAssetScanner('/repo', {
      runScan: vi.fn(),
      kill: vi.fn(),
      runProjectDeepScan
    } as never)

    const result = await scanner.scanProjectDeep!('/repo/p', { excludePaths: ['/skip'], respectGitignore: true })
    expect(result).toEqual({ assets: [], errors: [] })
    expect(runProjectDeepScan).toHaveBeenCalledWith({
      projectRoot: '/repo/p',
      excludePaths: ['/skip'],
      respectGitignore: true,
      projectScanCache: { entries: [] }
    })

    // The returned snapshot must ride into the next request (warm fingerprints).
    await scanner.scanProjectDeep!('/repo/q')
    expect(runProjectDeepScan).toHaveBeenLastCalledWith(
      expect.objectContaining({ projectRoot: '/repo/q', projectScanCache: returnedCache })
    )
  })
})
