import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cleanupState,
  collectProtectedUserDevProcesses,
  commandOwnsAgentDevState,
  createAgentDevContext,
  describeState,
  evaluateGuardAfter,
  formatResult,
  guardAfter,
  guardBefore,
  isInsideStateRoot,
  normalizeId,
  parseArgs,
  profileDir,
  readState,
  start,
  statePath,
  stopOne,
  writeState
} from '../../scripts/agent-dev-core.mjs'

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function makeContext() {
  const stateRoot = mkdtempSync(join(tmpdir(), 'berth-agent-core-test-'))
  tempRoots.push(stateRoot)
  return createAgentDevContext({
    root: 'D:\\Code\\berth',
    stateRoot,
    electronViteCli: 'D:\\Code\\berth\\node_modules\\electron-vite\\bin\\electron-vite.js'
  })
}

describe('agent dev core', () => {
  it('parses ids and json mode', () => {
    expect(normalizeId(' codex/run:1 ')).toBe('codex-run-1')
    expect(parseArgs(['status', 'agent-1', '--json'])).toEqual({
      command: 'status',
      all: false,
      json: true,
      id: 'agent-1'
    })
    expect(parseArgs(['guard', 'before', '--id', 'agent-1'])).toMatchObject({
      command: 'guard',
      guardAction: 'before',
      id: 'agent-1'
    })
  })

  it('protects removals outside the state root', () => {
    const context = makeContext()
    expect(isInsideStateRoot(context, join(context.stateRoot, 'agent-1.json'))).toBe(true)
    expect(isInsideStateRoot(context, 'D:\\Code\\berth\\package.json')).toBe(false)
  })

  it('checks process command ownership before stopping', async () => {
    const context = makeContext()
    writeState(context, {
      id: 'agent-1',
      pid: 123,
      startedAt: '2026-05-31T00:00:00.000Z',
      cwd: context.root,
      profileDir: profileDir(context, 'agent-1'),
      logPath: join(context.stateRoot, 'agent-1', 'electron-vite.log')
    })

    await expect(
      stopOne('agent-1', context, {
        isPidRunning: () => true,
        getProcessCommandLine: () => 'node unrelated.js',
        spawnSync: vi.fn()
      })
    ).rejects.toThrow(/Refusing to stop pid/)
  })

  it('cleans stale state before reusing an id', async () => {
    const context = makeContext()
    const staleProfile = profileDir(context, 'agent-1')
    writeState(context, {
      id: 'agent-1',
      pid: 123,
      startedAt: '2026-05-31T00:00:00.000Z',
      cwd: context.root,
      profileDir: staleProfile,
      logPath: join(context.stateRoot, 'agent-1', 'electron-vite.log')
    })
    mkdirSync(join(context.stateRoot, 'agent-1'), { recursive: true })
    writeFileSync(join(context.stateRoot, 'agent-1', 'old.txt'), 'stale')

    const spawnMock = vi.fn(() => ({ pid: 456, unref: vi.fn() }))
    await start(
      { id: 'agent-1' },
      context,
      {
        isPidRunning: () => false,
        spawn: spawnMock,
        waitForStart: vi.fn()
      }
    )

    const state = readState(context, 'agent-1')
    expect(state?.pid).toBe(456)
    expect(spawnMock).toHaveBeenCalledOnce()
  })

  it('summarizes stale states in status data', () => {
    const context = makeContext()
    const state = {
      id: 'agent-1',
      pid: 123,
      startedAt: '2026-05-31T00:00:00.000Z',
      cwd: context.root,
      profileDir: profileDir(context, 'agent-1'),
      logPath: join(context.stateRoot, 'agent-1', 'electron-vite.log')
    }

    expect(describeState(state, context, { isPidRunning: () => false })).toMatchObject({
      running: false,
      stale: true,
      owned: false
    })
  })

  it('formats human and json output separately', () => {
    expect(formatResult({ status: 'ok', instances: [] })).toBe('no agent dev instances\n')
    expect(JSON.parse(formatResult({ status: 'ok', instances: [] }, true))).toEqual({
      status: 'ok',
      instances: []
    })
  })

  it('collects and checks protected user dev processes', () => {
    const context = makeContext()
    const protectedProcesses = collectProtectedUserDevProcesses(
      [
        {
          pid: 1,
          parentPid: 0,
          name: 'node.exe',
          commandLine: 'node D:\\Code\\berth\\node_modules\\electron-vite\\bin\\electron-vite.js dev'
        },
        {
          pid: 2,
          parentPid: 1,
          name: 'electron.exe',
          commandLine: 'D:\\Code\\berth\\node_modules\\.pnpm\\electron\\dist\\electron.exe .'
        },
        {
          pid: 3,
          parentPid: 1,
          name: 'electron.exe',
          commandLine:
            'D:\\Code\\berth\\node_modules\\.pnpm\\electron\\dist\\electron.exe . --berth-agent-instance=agent-1'
        }
      ],
      context
    )

    expect(protectedProcesses.map((item) => item.pid)).toEqual([1, 2])
    expect(
      evaluateGuardAfter(
        { protectedProcesses },
        protectedProcesses.filter((item) => item.pid !== 2)
      )
    ).toMatchObject({ ok: false, missing: [protectedProcesses[1]] })
  })

  it('writes and validates guard snapshots', () => {
    const context = makeContext()
    const processes = [
      {
        pid: 1,
        parentPid: 0,
        name: 'node.exe',
        commandLine: 'node D:\\Code\\berth\\node_modules\\electron-vite\\bin\\electron-vite.js dev'
      }
    ]

    expect(guardBefore({ id: 'agent-1' }, context, { listProcesses: () => processes })).toMatchObject({
      status: 'guarded',
      protectedProcesses: processes
    })
    expect(guardAfter({ id: 'agent-1' }, context, { listProcesses: () => processes })).toMatchObject({
      status: 'guard-ok'
    })

    cleanupState(context, { id: 'agent-1' })
  })

  it('matches owned command lines', () => {
    const context = makeContext()
    expect(
      commandOwnsAgentDevState(
        'node D:\\Code\\berth\\node_modules\\electron-vite\\bin\\electron-vite.js dev -- --berth-agent-instance=agent-1',
        { id: 'agent-1' },
        context
      )
    ).toBe(true)
  })

  it('exposes state paths for tests without writing outside state root', () => {
    const context = makeContext()
    expect(statePath(context, 'agent-1')).toContain(context.stateRoot)
  })
})
