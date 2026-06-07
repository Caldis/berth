import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

// GH-113 T3b: the global scope shows EVERY session-derived project's root
// conventions via the shallow index, while project scope filters to the selected
// project. This exercises the full worker → IPC → scope-predicate pipeline.

let app: ElectronApplication
let page: Page
let tempDir: string
let alphaDir: string
let bravoDir: string

function writeCodexSession(sessionsDir: string, id: string, cwd: string): void {
  writeFileSync(
    join(sessionsDir, `rollout-${id}.jsonl`),
    JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-06-02T00:00:00.000Z',
      payload: { id, cwd, model: 'gpt-5' }
    }) + '\n'
  )
}

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  tempDir = testInfo.outputPath('global-shallow-fixture')
  const userDataDir = join(tempDir, 'user-data')
  const codexHome = join(tempDir, 'codex-home')
  const sessionsDir = join(codexHome, 'sessions')
  alphaDir = join(tempDir, 'proj-alpha')
  bravoDir = join(tempDir, 'proj-bravo')

  mkdirSync(userDataDir, { recursive: true })
  mkdirSync(sessionsDir, { recursive: true })
  // Two independent git projects, each with a root AGENTS.md.
  for (const dir of [alphaDir, bravoDir]) {
    mkdirSync(join(dir, '.git'), { recursive: true })
    writeFileSync(join(dir, 'AGENTS.md'), `# ${dir} conventions\nbody`)
  }
  writeCodexSession(sessionsDir, 'alpha-session', alphaDir)
  writeCodexSession(sessionsDir, 'bravo-session', bravoDir)

  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
    env: { ...process.env, CODEX_HOME: codexHome, NODE_ENV: 'test' }
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterEach(async () => {
  await app?.close()
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

test('global scope shallow-indexes every project; project scope filters to one', async () => {
  // The app loaded and scanned once the project-scope control is present.
  await expect(page.locator('aside').getByRole('button', { name: /^(Project scope|项目范围)$/ })).toBeVisible()

  // Both projects' root AGENTS.md are shallow-indexed into the global snapshot.
  await expect.poll(() => shallowOwners()).toEqual(
    expect.arrayContaining([normalize(alphaDir), normalize(bravoDir)])
  )

  // Global search surfaces both projects' conventions.
  expect(await searchPaths('alpha')).toContain(normalize(join(alphaDir, 'AGENTS.md')))
  expect(await searchPaths('bravo')).toContain(normalize(join(bravoDir, 'AGENTS.md')))

  // Switching to project alpha filters the other project's convention OUT.
  await setProjectScope(alphaDir)
  await expect.poll(() => searchPaths('bravo')).not.toContain(normalize(join(bravoDir, 'AGENTS.md')))
  expect(await searchPaths('alpha')).toContain(normalize(join(alphaDir, 'AGENTS.md')))
})

function normalize(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

async function shallowOwners(): Promise<string[]> {
  return page.evaluate(async () => {
    const snap = (await window.api.assets.snapshot()) as { assets?: Array<{ type: string; meta?: Record<string, unknown> }> }
    return (snap.assets ?? [])
      .filter((a) => a.type === 'agents-md' && a.meta?.scanDepth === 'shallow')
      .map((a) => String(a.meta?.projectPath ?? '').replace(/\\/g, '/').toLowerCase())
  })
}

async function searchPaths(query: string): Promise<string[]> {
  return page.evaluate(async (q) => {
    const results = (await window.api.assets.search(q)) as Array<{ asset?: { path?: string } }>
    return results.map((r) => String(r.asset?.path ?? '').replace(/\\/g, '/').toLowerCase())
  }, query)
}

async function setProjectScope(projectPath: string): Promise<void> {
  await page.evaluate(async (dir) => {
    await window.api.projectScope.setScope({
      mode: 'project',
      projectPath: dir,
      projectPathKey: dir.replace(/\\/g, '/').toLowerCase()
    })
  }, projectPath)
}
