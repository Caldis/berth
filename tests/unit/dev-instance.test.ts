import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  configureAgentDevProfile,
  normalizeAgentInstanceId,
  resolveAgentDevInstanceId,
  shouldRequestSingleInstanceLock
} from '../../src/main/dev-instance'

const tempRoots: string[] = []

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'berth-agent-dev-test-'))
  tempRoots.push(root)
  return root
}

describe('dev agent instance', () => {
  it('normalizes instance ids for path-safe profile directories', () => {
    expect(normalizeAgentInstanceId(' codex/run:1 ')).toBe('codex-run-1')
    expect(normalizeAgentInstanceId('../')).toBeUndefined()
    expect(normalizeAgentInstanceId('')).toBeUndefined()
  })

  it('resolves instance ids from argv before env in dev mode', () => {
    const id = resolveAgentDevInstanceId({
      isDev: true,
      argv: ['electron', '.', '--berth-agent-instance=argv-id'],
      env: { BERTH_AGENT_INSTANCE_ID: 'env-id' }
    })

    expect(id).toBe('argv-id')
  })

  it('ignores agent markers outside dev mode', () => {
    const id = resolveAgentDevInstanceId({
      isDev: false,
      argv: ['electron', '.', '--berth-agent-instance=argv-id'],
      env: { BERTH_AGENT_INSTANCE_ID: 'env-id' }
    })

    expect(id).toBeUndefined()
  })

  it('configures isolated user data and session data paths for agent dev', () => {
    const tempRoot = makeTempRoot()
    const setPath = vi.fn()
    const app = { setPath }

    const profile = configureAgentDevProfile(app, {
      isDev: true,
      argv: ['electron', '.', '--berth-agent-instance=agent-1'],
      env: {},
      tempRoot
    })

    const profileDir = join(tempRoot, 'agent-1', 'profile')
    expect(profile).toEqual({ id: 'agent-1', profileDir })
    expect(setPath).toHaveBeenCalledWith('userData', profileDir)
    expect(setPath).toHaveBeenCalledWith('sessionData', profileDir)
    expect(shouldRequestSingleInstanceLock(profile)).toBe(true)
  })

  it('keeps the normal single-instance lock when no agent profile is configured', () => {
    const setPath = vi.fn()
    const profile = configureAgentDevProfile(
      { setPath },
      { isDev: true, argv: ['electron', '.'], env: {} }
    )

    expect(profile).toBeUndefined()
    expect(setPath).not.toHaveBeenCalled()
    expect(shouldRequestSingleInstanceLock(profile)).toBe(true)
  })
})
