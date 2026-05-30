import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claudeScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  codexScanAll: vi.fn(async () => ({ assets: [], errors: [] })),
  claudeDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }]
  })),
  claudeCoverage: vi.fn(async () => [
    {
      path: 'C:\\Users\\test\\.claude',
      scope: 'user',
      description: 'Claude user config',
      kind: 'directory',
      status: 'scanned'
    }
  ]),
  codexDetect: vi.fn(async () => ({
    installed: true,
    paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }]
  })),
  codexCoverage: vi.fn(async () => [
    {
      path: 'C:\\Users\\test\\.codex\\sessions',
      scope: 'user',
      description: 'Codex sessions',
      kind: 'directory',
      status: 'scanned'
    }
  ])
}))

vi.mock('../../src/main/adapters/claude-code', () => ({
  ClaudeCodeAdapter: class {
    id = 'claude-code'
    displayName = 'Claude Code'
    scanAll = mocks.claudeScanAll
    detect = mocks.claudeDetect
    scanSourceCoverage = mocks.claudeCoverage
  }
}))

vi.mock('../../src/main/adapters/codex', () => ({
  CodexAdapter: class {
    id = 'codex'
    displayName = 'Codex'
    scanAll = mocks.codexScanAll
    detect = mocks.codexDetect
    scanSourceCoverage = mocks.codexCoverage
  }
}))

import { AssetScanner } from '../../src/main/engine/scanner'

describe('AssetScanner', () => {
  beforeEach(() => {
    mocks.claudeScanAll.mockClear()
    mocks.codexScanAll.mockClear()
    mocks.claudeDetect.mockClear()
    mocks.codexDetect.mockClear()
    mocks.claudeCoverage.mockClear()
    mocks.codexCoverage.mockClear()
    mocks.claudeDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }]
    })
    mocks.codexDetect.mockResolvedValue({
      installed: true,
      paths: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }]
    })
    mocks.claudeCoverage.mockResolvedValue([
      {
        path: 'C:\\Users\\test\\.claude',
        scope: 'user',
        description: 'Claude user config',
        kind: 'directory',
        status: 'scanned'
      }
    ])
    mocks.codexCoverage.mockResolvedValue([
      {
        path: 'C:\\Users\\test\\.codex\\sessions',
        scope: 'user',
        description: 'Codex sessions',
        kind: 'directory',
        status: 'scanned'
      }
    ])
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
        roots: [{ path: 'C:\\Users\\test\\.claude', scope: 'user', description: 'Claude user config' }],
        sources: [
          {
            path: 'C:\\Users\\test\\.claude',
            scope: 'user',
            description: 'Claude user config',
            kind: 'directory',
            status: 'scanned'
          }
        ]
      },
      {
        agentId: 'codex',
        agentName: 'Codex',
        installed: true,
        roots: [{ path: 'C:\\Users\\test\\.codex\\sessions', scope: 'user', description: 'Codex sessions' }],
        sources: [
          {
            path: 'C:\\Users\\test\\.codex\\sessions',
            scope: 'user',
            description: 'Codex sessions',
            kind: 'directory',
            status: 'scanned'
          }
        ]
      }
    ])
    expect(mocks.claudeScanAll).not.toHaveBeenCalled()
    expect(mocks.codexScanAll).not.toHaveBeenCalled()
  })

  it('adds session-derived project source candidates without scanning project directories', async () => {
    const projectPath = process.cwd()
    mocks.claudeScanAll.mockResolvedValueOnce({
      assets: [
        {
          id: 'session-1',
          agentId: 'claude-code',
          category: 'state',
          type: 'session',
          scope: 'session',
          name: 'Session',
          path: 'C:\\Users\\test\\.claude\\projects\\session.jsonl',
          meta: { projectPath }
        }
      ],
      errors: []
    })
    const scanner = new AssetScanner()

    await scanner.scanAll()
    const groups = await scanner.getScanSourceGroups()

    expect(groups[0]?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: projectPath,
          scope: 'project',
          status: 'not-scanned',
          reason: 'session-derived-project'
        })
      ])
    )
    expect(mocks.claudeScanAll).toHaveBeenCalledTimes(1)
  })

  it('keeps other source groups visible when one adapter detection fails', async () => {
    mocks.claudeDetect.mockRejectedValueOnce(new Error('permission denied'))
    const scanner = new AssetScanner()

    const groups = await scanner.getScanSourceGroups()

    expect(groups[0]).toEqual({
      agentId: 'claude-code',
      agentName: 'Claude Code',
      installed: false,
      roots: [],
      sources: []
    })
    expect(groups[1]?.agentId).toBe('codex')
    expect(groups[1]?.installed).toBe(true)
  })
})
