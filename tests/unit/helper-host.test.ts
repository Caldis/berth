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

import { ScanHelperHost } from '../../src/main/helper-host'

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
  send(message: AssetWorkerMessage): void {
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
})
