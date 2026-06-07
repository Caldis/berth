import { test, expect, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// GH-113 T1: the snapshot is persisted on scan completion and restored on a cold
// start, so a relaunch shows the last result instantly (then revalidates). This
// closes the persistence loop end-to-end through the real worker + IPC.

let tempDir: string
let userDataDir: string

async function launch(): Promise<ElectronApplication> {
  return electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
    env: { ...process.env, CODEX_HOME: join(tempDir, 'codex-home'), NODE_ENV: 'test' }
  })
}

test('persists the snapshot on scan and cold-starts from it on relaunch', async ({ browserName: _b }, info) => {
  tempDir = info.outputPath('snap-persist')
  userDataDir = join(tempDir, 'user-data')
  const sessionsDir = join(tempDir, 'codex-home', 'sessions')
  const projectDir = join(tempDir, 'proj')
  mkdirSync(userDataDir, { recursive: true })
  mkdirSync(sessionsDir, { recursive: true })
  mkdirSync(join(projectDir, '.git'), { recursive: true })
  writeFileSync(join(projectDir, 'AGENTS.md'), '# Persisted project conventions\nbody')
  writeFileSync(
    join(sessionsDir, 'rollout-persist.jsonl'),
    JSON.stringify({ type: 'session_meta', timestamp: '2026-06-02T00:00:00.000Z', payload: { id: 'persist-session', cwd: projectDir, model: 'gpt-5' } }) + '\n'
  )

  // Run 1 — scan, then the runtime persists the snapshot on completion.
  const app1 = await launch()
  try {
    const page1 = await app1.firstWindow()
    await page1.waitForLoadState('domcontentloaded')
    await page1.locator('aside').first().waitFor()
    await expect
      .poll(() => page1.evaluate(async () => (await window.api.assets.status())?.state), { timeout: 15000 })
      .toBe('ready')
    const count1 = await page1.evaluate(async () => (await window.api.assets.snapshot()).assets.length)
    expect(count1).toBeGreaterThan(0)
  } finally {
    await app1.close()
  }

  // The persisted snapshot file exists, is versioned, has assets, and is lean.
  const snapPath = join(userDataDir, 'berth-snapshot.json')
  expect(existsSync(snapPath)).toBe(true)
  const persisted = JSON.parse(readFileSync(snapPath, 'utf-8'))
  expect(persisted.version).toBe(1)
  expect(persisted.snapshot.assets.length).toBeGreaterThan(0)
  expect(persisted.snapshot.assets.every((a: { raw?: unknown }) => a.raw === undefined)).toBe(true)

  // Run 2 — cold start: the persisted assets are available immediately (the very
  // first snapshot read is already populated, before a fresh scan could finish).
  const app2 = await launch()
  try {
    const page2 = await app2.firstWindow()
    await page2.waitForLoadState('domcontentloaded')
    const coldCount = await page2.evaluate(async () => (await window.api.assets.snapshot()).assets.length)
    expect(coldCount).toBeGreaterThan(0)
  } finally {
    await app2.close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
