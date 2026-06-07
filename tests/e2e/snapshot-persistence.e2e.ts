import { test, expect, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// GH-113 I3: the snapshot is persisted to an on-disk SQLite index on scan
// completion and restored on a cold start, so a relaunch shows the last result
// instantly (then revalidates). This closes the persistence loop end-to-end
// through the real worker + IPC, and proves better-sqlite3's Electron-ABI
// binding opens a real DB inside the packaged main process.

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

  // The persisted SQLite index exists on disk. Its row-level contents (schema
  // versioning, lean raw-stripping) are covered by the unit tests — the e2e host
  // runs on system Node and cannot load the Electron-ABI better-sqlite3 binding,
  // so here we assert the file exists and prove the data survives via the
  // cold-start read below.
  const dbPath = join(userDataDir, 'berth-index.db')
  expect(existsSync(dbPath)).toBe(true)

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
