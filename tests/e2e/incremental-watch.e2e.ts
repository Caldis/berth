import { test, expect, type ElectronApplication } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// GH-113 cap-4: end-to-end proof of the real-time incremental write path. A real
// chokidar event on a watched capability file is re-derived for that file alone
// and folded into the live snapshot — NOT a full rescan. The "incremental, not
// full" claim is verified by the snapshot id staying stable: applyFileChange keeps
// the id (so id-keyed consumers don't re-fetch), while a full refresh mints a new one.

let tempDir: string

function skill(name: string): string {
  return ['---', `name: ${name}`, `description: ${name} skill`, '---', 'body'].join('\n')
}

test('folds a newly-added watched skill into the snapshot incrementally (id stays stable)', async ({ browserName: _b }, info) => {
  tempDir = info.outputPath('incremental-watch')
  const userDataDir = join(tempDir, 'user-data')
  const codexHome = join(tempDir, 'codex-home')
  const projectDir = join(tempDir, 'proj')
  const sessionsDir = join(codexHome, 'sessions')
  const skillsDir = join(projectDir, '.agents', 'skills')

  mkdirSync(userDataDir, { recursive: true })
  mkdirSync(sessionsDir, { recursive: true })
  mkdirSync(join(projectDir, '.git'), { recursive: true })
  mkdirSync(join(skillsDir, 'seed'), { recursive: true })
  writeFileSync(join(skillsDir, 'seed', 'SKILL.md'), skill('seed'))
  // A codex session whose cwd is the project makes it an activatable candidate.
  writeFileSync(
    join(sessionsDir, 'rollout-watch.jsonl'),
    JSON.stringify({ type: 'session_meta', timestamp: '2026-06-02T00:00:00.000Z', payload: { id: 'watch-session', cwd: projectDir, model: 'gpt-5' } }) + '\n'
  )

  const app: ElectronApplication = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
    env: { ...process.env, CODEX_HOME: codexHome, NODE_ENV: 'test' }
  })
  try {
    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.locator('aside').first().waitFor()

    // Activate the temp project so the watcher restarts and watches its .agents/skills.
    const before = await page.evaluate(async (p) => {
      await window.api.projectScope.activate({ projectPath: p })
      const snap = await window.api.assets.snapshot()
      return { id: snap.id, skillNames: snap.assets.filter((a) => a.type === 'skill').map((a) => a.name) }
    }, projectDir)
    expect(before.skillNames).toContain('seed') // the full scan picked up the seed skill
    expect(before.skillNames).not.toContain('added')

    // Real filesystem change: add a new skill under the watched directory.
    mkdirSync(join(skillsDir, 'added'), { recursive: true })
    writeFileSync(join(skillsDir, 'added', 'SKILL.md'), skill('added'))

    // The watcher re-derives just that file and folds it in — the new skill appears.
    await expect
      .poll(() => page.evaluate(async () => {
        const snap = await window.api.assets.snapshot()
        return snap.assets.some((a) => a.type === 'skill' && a.name === 'added')
      }), { timeout: 15000 })
      .toBe(true)

    // Incremental, not a full rescan: the snapshot id is unchanged.
    const afterId = await page.evaluate(async () => (await window.api.assets.snapshot()).id)
    expect(afterId).toBe(before.id)
  } finally {
    await app.close()
    rmSync(tempDir, { recursive: true, force: true })
  }
})
