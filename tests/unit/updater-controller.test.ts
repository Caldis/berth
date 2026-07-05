import { describe, it, expect, vi } from 'vitest'
import { createUpdaterController, type UpdaterLike } from '../../src/main/updater'
import type { UpdateState } from '@shared/types/ipc'

// GH-124/GH-134: the controller normalizes electron-updater events into the
// single update:state payload and applies preferences. Since macOS is signed
// (GH-134), all platforms run real download/install — no platformLimited branch.
type Listener = (...args: never[]) => void

function fakeUpdater(): UpdaterLike & {
  listeners: Map<string, Listener>
  fire(event: string, ...args: unknown[]): void
  checkForUpdates: ReturnType<typeof vi.fn>
  downloadUpdate: ReturnType<typeof vi.fn>
  quitAndInstall: ReturnType<typeof vi.fn>
} {
  const listeners = new Map<string, Listener>()
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    forceDevUpdateConfig: false,
    fullChangelog: false,
    listeners,
    on(event: string, listener: Listener) {
      listeners.set(event, listener)
      return this
    },
    fire(event: string, ...args: unknown[]) {
      listeners.get(event)?.(...(args as never[]))
    },
    checkForUpdates: vi.fn(async () => null),
    downloadUpdate: vi.fn(async () => null),
    quitAndInstall: vi.fn()
  }
}

function setup(prefs: Partial<{ autoCheck: boolean; autoDownload: boolean; allowPrerelease: boolean }> = {}) {
  const updater = fakeUpdater()
  const states: UpdateState[] = []
  const log = vi.fn()
  const controller = createUpdaterController({
    autoUpdater: updater,
    isPackaged: true,
    preferences: { autoCheck: true, autoDownload: false, allowPrerelease: false, ...prefs },
    emit: (s) => states.push(s),
    log
  })
  return { updater, states, log, controller }
}

describe('createUpdaterController', () => {
  it('normalizes the event stream into update:state phases', () => {
    const { updater, states } = setup()
    updater.fire('checking-for-update')
    updater.fire('update-available', { version: '0.3.0', releaseNotes: 'notes' })
    updater.fire('download-progress', { percent: 41.7 })
    updater.fire('update-downloaded', { version: '0.3.0' })

    expect(states.map((s) => s.phase)).toEqual(['checking', 'available', 'downloading', 'downloaded'])
    expect(states[1]).toMatchObject({ version: '0.3.0', releaseNotes: [{ version: '0.3.0', note: 'notes' }] })
    expect(states[2].percent).toBe(42)
  })

  it('enables fullChangelog so GitHub provider returns cross-version notes (GH-156)', () => {
    const { updater } = setup()
    expect(updater.fullChangelog).toBe(true)
  })

  it('normalizes ReleaseNoteInfo[] into capped, filtered entries (GH-156)', () => {
    const { updater, states } = setup()
    const longNote = 'x'.repeat(5000)
    const entries = [
      { version: '0.5.0', note: '<p>new stuff</p>' },
      { version: '0.4.10', note: null },
      { version: '0.4.9', note: longNote },
      ...Array.from({ length: 25 }, (_, i) => ({ version: `0.3.${25 - i}`, note: `fix ${i}` }))
    ]
    updater.fire('update-available', { version: '0.5.0', releaseNotes: entries })

    const notes = states.at(-1)?.releaseNotes
    expect(notes).toBeDefined()
    // null-note entry dropped, list capped at 20
    expect(notes).toHaveLength(20)
    expect(notes?.[0]).toEqual({ version: '0.5.0', note: '<p>new stuff</p>' })
    // per-note truncation to 4000 chars
    expect(notes?.[1].version).toBe('0.4.9')
    expect(notes?.[1].note).toHaveLength(4000)
  })

  it('update-downloaded carries releaseNotes when provided (GH-156)', () => {
    const { updater, states } = setup()
    updater.fire('update-downloaded', { version: '0.5.0', releaseNotes: 'ready' })
    expect(states.at(-1)).toMatchObject({
      phase: 'downloaded',
      version: '0.5.0',
      releaseNotes: [{ version: '0.5.0', note: 'ready' }]
    })
  })

  it('silences non-user-initiated errors to not-available but always logs (GH-156)', async () => {
    const { updater, states, log, controller } = setup()
    // startup auto-check: error event degrades to not-available
    await controller.check({ userInitiated: false })
    updater.fire('error', new Error('offline'))
    expect(states.at(-1)).toMatchObject({ phase: 'not-available' })
    expect(log).toHaveBeenCalledWith('updater', expect.any(Error))

    // auto-check rejection path: same silencing
    updater.checkForUpdates.mockRejectedValueOnce(new Error('net down'))
    await controller.check({ userInitiated: false })
    expect(states.at(-1)).toMatchObject({ phase: 'not-available' })
  })

  it('surfaces errors from user-initiated check/download (GH-156)', async () => {
    const { updater, states, controller } = setup()
    await controller.check()
    updater.fire('error', new Error('boom'))
    expect(states.at(-1)).toMatchObject({ phase: 'error', error: 'boom' })

    updater.downloadUpdate.mockRejectedValueOnce(new Error('disk full'))
    await controller.download()
    expect(states.at(-1)).toMatchObject({ phase: 'error', error: 'disk full' })

    updater.checkForUpdates.mockRejectedValueOnce(new Error('net down'))
    await controller.check()
    expect(states.at(-1)).toMatchObject({ phase: 'error', error: 'net down' })
  })

  it('applies preferences: autoDownload + allowPrerelease follow the user setting', () => {
    const { updater, controller } = setup({ autoDownload: true, allowPrerelease: true })
    expect(updater.autoDownload).toBe(true)
    expect(updater.autoInstallOnAppQuit).toBe(true)
    expect(updater.allowPrerelease).toBe(true)
    controller.applyPreferences({ autoCheck: true, autoDownload: false, allowPrerelease: false })
    expect(updater.autoDownload).toBe(false)
    expect(updater.allowPrerelease).toBe(false)
  })

  it('runs real download/install on every platform (no platformLimited after signing, GH-134)', async () => {
    const { updater, states, controller } = setup({ autoDownload: true })
    // autoDownload honors preference (no darwin force-off); states carry no platformLimited
    expect(updater.autoDownload).toBe(true)

    updater.fire('update-available', { version: '0.3.0' })
    expect(states.at(-1)).toMatchObject({ phase: 'available', version: '0.3.0' })
    expect(states.at(-1)).not.toHaveProperty('platformLimited')

    await controller.download()
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(1)
    controller.install()
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('check() asks the server', async () => {
    const { updater, controller } = setup()
    await controller.check()
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('dev mode (isPackaged=false) forces the dev update config', () => {
    const updater = fakeUpdater()
    createUpdaterController({
      autoUpdater: updater,
      isPackaged: false,
      preferences: { autoCheck: true, autoDownload: false, allowPrerelease: false },
      emit: () => {},
      log: () => {}
    })
    expect(updater.forceDevUpdateConfig).toBe(true)
  })
})
