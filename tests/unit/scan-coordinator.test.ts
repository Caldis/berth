import { describe, it, expect, vi } from 'vitest'
import { ScanCoordinator, type ScanSink } from '@berth/scan-engine/engine/assets/scan-coordinator'
import type { AssetRuntimeScanner } from '@berth/scan-engine/engine/assets/runtime'
import type { ScanResult } from '@shared/types/ipc'

// GH-122 T3: the coordinator owns the scanner lifecycle, in-flight dedupe and
// the generation guard (GH-111 R4) — a swapped-away scan must never reach the
// sink. Previously this logic was only testable through the full runtime.

const emptyResult: ScanResult = {
  assets: [],
  stats: { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
  errors: []
}

function sink(overrides: Partial<ScanSink> = {}): ScanSink {
  return {
    onProgress: vi.fn(),
    onPartial: vi.fn(),
    onCompleted: vi.fn(),
    onFailed: vi.fn(),
    ...overrides
  }
}

function scannerWith(overrides: Partial<AssetRuntimeScanner> = {}): AssetRuntimeScanner {
  return {
    scanAll: async () => emptyResult,
    getScanSourceGroups: async () => [],
    getProjectScopeCandidates: () => [],
    getProjectDir: () => undefined,
    ...overrides
  }
}

describe('ScanCoordinator', () => {
  it('runs a scan to completion and delivers the outcome', async () => {
    const coordinator = new ScanCoordinator(() => scannerWith({ getProjectDir: () => 'D:/p' }))
    const s = sink()

    await coordinator.run(s)

    expect(s.onCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ scanResult: emptyResult, projectDir: 'D:/p' })
    )
    expect(s.onFailed).not.toHaveBeenCalled()
    expect(coordinator.isScanning()).toBe(false)
  })

  it('dedupes concurrent runs onto the same in-flight promise', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const scanAll = vi.fn(async () => { await gate; return emptyResult })
    const coordinator = new ScanCoordinator(() => scannerWith({ scanAll }))
    const s = sink()

    const first = coordinator.run(s)
    const second = coordinator.run(s)

    expect(second).toBe(first)
    expect(coordinator.isScanning()).toBe(true)
    release()
    await first
    expect(scanAll).toHaveBeenCalledTimes(1)
    expect(coordinator.isScanning()).toBe(false)
  })

  it('wait() resolves with the in-flight scan and immediately when idle', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const coordinator = new ScanCoordinator(() => scannerWith({ scanAll: async () => { await gate; return emptyResult } }))

    await coordinator.wait() // idle: resolves immediately

    const run = coordinator.run(sink())
    const waited = coordinator.wait()
    release()
    await expect(Promise.all([run, waited])).resolves.toBeDefined()
  })

  it('drops every callback of a scan whose generation was swapped away (R4)', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    let emitProgress!: () => void
    const scanner = scannerWith({
      scanAll: async (options) => {
        emitProgress = () => options?.onProgress?.({ scannedFiles: 1 } as never)
        await gate
        return emptyResult
      }
    })
    const coordinator = new ScanCoordinator((dir) => (dir === 'next' ? scannerWith() : scanner))
    const s = sink()

    const run = coordinator.run(s)
    coordinator.swap('next') // switch projects mid-flight
    emitProgress()
    release()
    await run

    expect(s.onProgress).not.toHaveBeenCalled()
    expect(s.onCompleted).not.toHaveBeenCalled()
    expect(s.onFailed).not.toHaveBeenCalled()
  })

  it('routes scan failures to onFailed and clears in-flight for the next run', async () => {
    const failing = scannerWith({ scanAll: async () => { throw new Error('scan exploded') } })
    const coordinator = new ScanCoordinator(() => failing)
    const s = sink()

    await coordinator.run(s)

    expect(s.onFailed).toHaveBeenCalledWith(expect.objectContaining({ message: 'scan exploded' }))
    expect(s.onCompleted).not.toHaveBeenCalled()
    expect(coordinator.isScanning()).toBe(false)

    await coordinator.run(s) // a fresh run is possible after failure
    expect(s.onFailed).toHaveBeenCalledTimes(2)
  })
})
