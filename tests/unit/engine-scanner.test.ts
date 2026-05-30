import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claudeScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  codexScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  claudeDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }]
  })),
  codexDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }]
  }))
}))

vi.mock('../../src/main/adapters/claude-code', () => ({
  ClaudeCodeAdapter: class {
    id = 'claude-code'
    displayName = 'Claude Code'
    scanAll = mocks.claudeScanAll
    detect = mocks.claudeDetect
  }
}))

vi.mock('../../src/main/adapters/codex', () => ({
  CodexAdapter: class {
    id = 'codex'
    displayName = 'Codex'
    scanAll = mocks.codexScanAll
    detect = mocks.codexDetect
  }
}))

import { AssetScanner } from '../../src/main/engine/scanner'

describe('AssetScanner', () => {
  beforeEach(() => {
    mocks.claudeScanAll.mockClear()
    mocks.codexScanAll.mockClear()
    mocks.claudeDetect.mockClear()
    mocks.codexDetect.mockClear()
    mocks.claudeDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }]
    })
    mocks.codexDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }]
    })
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

  it('reports scan source groups from every adapter without scanning assets', async () => {
    const scanner = new AssetScanner()

    const groups = await scanner.getScanSourceGroups()

    expect(groups).toEqual([
      {
        agentId: 'claude-code',
        agentName: 'Claude Code',
        installed: true,
        roots: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }]
      },
      {
        agentId: 'codex',
        agentName: 'Codex',
        installed: true,
        roots: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }]
      }
    ])
    expect(mocks.claudeScanAll).not.toHaveBeenCalled()
    expect(mocks.codexScanAll).not.toHaveBeenCalled()
  })

  it('keeps other source groups visible when one adapter detection fails', async () => {
    mocks.claudeDetect.mockRejectedValueOnce(new Error('permission denied'))
    const scanner = new AssetScanner()

    const groups = await scanner.getScanSourceGroups()

    expect(groups[0]).toEqual({
      agentId: 'claude-code',
      agentName: 'Claude Code',
      installed: false,
      roots: []
    })
    expect(groups[1]?.agentId).toBe('codex')
    expect(groups[1]?.installed).toBe(true)
  })
})
