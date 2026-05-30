import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  scanAll: vi.fn(async () => ({ assets: [], errors: [] }))
}))

vi.mock('../../src/main/adapters/claude-code', () => ({
  ClaudeCodeAdapter: class {
    scanAll = mocks.scanAll
  }
}))

import { AssetScanner } from '../../src/main/engine/scanner'

describe('AssetScanner', () => {
  beforeEach(() => {
    mocks.scanAll.mockClear()
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

    expect(mocks.scanAll).toHaveBeenCalledTimes(1)
  })
})
