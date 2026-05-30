import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claudeScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  codexScanAll: vi.fn(async () => ({ assets: [], errors: [] }))
}))

vi.mock('../../src/main/adapters/claude-code', () => ({
  ClaudeCodeAdapter: class {
    scanAll = mocks.claudeScanAll
  }
}))

vi.mock('../../src/main/adapters/codex', () => ({
  CodexAdapter: class {
    scanAll = mocks.codexScanAll
  }
}))

import { AssetScanner } from '../../src/main/engine/scanner'

describe('AssetScanner', () => {
  beforeEach(() => {
    mocks.claudeScanAll.mockClear()
    mocks.codexScanAll.mockClear()
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
})
