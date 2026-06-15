import { test, expect, type ElectronApplication } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { prepareIsolatedDirs, launchBerthApp, type IsolatedDirs } from './launch'

// GH-135 F2: the index control commands (pause / resume / rebuild) round-trip
// through the real preload → IPC → main runtime → helper / SQLite snapshot store.
// Verifies the scheduler reports paused/resumed, and — the data-safety guarantee —
// that a destructive rebuild clears the index and rescans back to a populated,
// ready state with a fresh snapshot id (rebuild never leaves the index empty).
// Cancel-mid-scan (preserve already-scanned assets) is timing-sensitive and is
// covered deterministically by the runtime unit tests (agent-asset-runtime.test).

let tempDir: string
let dirs: IsolatedDirs

test('pauses/resumes the scheduler and rebuilds the index safely', async ({ browserName: _b }, info) => {
  tempDir = info.outputPath('scan-control')
  dirs = prepareIsolatedDirs(tempDir)
  const sessionsDir = join(dirs.codexHome, 'sessions')
  const projectDir = join(tempDir, 'proj')
  mkdirSync(sessionsDir, { recursive: true })
  mkdirSync(join(projectDir, '.git'), { recursive: true })
  writeFileSync(join(projectDir, 'AGENTS.md'), '# control project conventions\nbody')
  writeFileSync(
    join(sessionsDir, 'rollout-ctl.jsonl'),
    JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-06-02T00:00:00.000Z',
      payload: { id: 'ctl-session', cwd: projectDir, model: 'gpt-5' }
    }) + '\n'
  )

  const run = await launchBerthApp(dirs)
  const app: ElectronApplication = run.app
  try {
    const page = run.page
    await page.locator('aside').first().waitFor()

    // Initial scan completes with assets discovered.
    await expect
      .poll(() => page.evaluate(async () => (await window.api.assets.status())?.state), { timeout: 15000 })
      .toBe('ready')
    const before = await page.evaluate(async () => await window.api.assets.snapshot())
    expect(before.assets.length).toBeGreaterThan(0)

    // Pause → the scheduler reports paused; resume → it clears.
    await page.evaluate(async () => {
      await window.api.assets.pause()
    })
    await expect
      .poll(() => page.evaluate(async () => (await window.api.assets.engineInfo()).scheduler.paused), { timeout: 5000 })
      .toBe(true)
    await page.evaluate(async () => {
      await window.api.assets.resume()
    })
    await expect
      .poll(() => page.evaluate(async () => (await window.api.assets.engineInfo()).scheduler.paused), { timeout: 5000 })
      .toBe(false)

    // Rebuild → clears the index and rescans. Wait for the fresh scan to finish,
    // then assert the index is repopulated (data-safety) under a new snapshot id
    // (proves a real rescan ran rather than a stale read).
    await page.evaluate(async () => {
      await window.api.assets.rebuild()
    })
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const status = await window.api.assets.status()
            const snap = await window.api.assets.snapshot()
            return status?.state === 'ready' && snap.id !== '' && snap.assets.length > 0 ? snap.id : null
          }),
        { timeout: 15000 }
      )
      .not.toBeNull()
    const after = await page.evaluate(async () => await window.api.assets.snapshot())
    expect(after.assets.length).toBeGreaterThan(0)
    expect(after.id).not.toBe(before.id)
  } finally {
    await app.close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
