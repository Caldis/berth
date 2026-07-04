import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { prepareIsolatedDirs, launchBerthApp } from './launch'

// GH-155: the background index queue deep-scans every session-derived project so
// the global scope becomes progressively complete WITHOUT activating anything —
// nested capabilities/conventions that the shallow index can't see must appear,
// and the N/M status must reach done (banner gone). Exercises the full chain:
// commitScan → queue sync → helper scan-project-deep → applyBackgroundProjectResult
// → IPC snapshot/search/status.

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
  tempDir = testInfo.outputPath('deep-index-fixture')
  const dirs = prepareIsolatedDirs(tempDir)
  const sessionsDir = join(dirs.codexHome, 'sessions')
  alphaDir = join(tempDir, 'proj-alpha')
  bravoDir = join(tempDir, 'proj-bravo')
  mkdirSync(sessionsDir, { recursive: true })

  // alpha: nested convention deep in the tree — invisible to the shallow index.
  mkdirSync(join(alphaDir, '.git'), { recursive: true })
  writeFileSync(join(alphaDir, 'AGENTS.md'), '# alpha conventions')
  mkdirSync(join(alphaDir, 'packages', 'sub'), { recursive: true })
  writeFileSync(join(alphaDir, 'packages', 'sub', 'CLAUDE.md'), '# zulu nested convention')

  // bravo: a skill under a monorepo SUBDIR's own .claude — only the config-root
  // chain of the session cwd (bravo/packages/x) reaches it.
  mkdirSync(join(bravoDir, '.git'), { recursive: true })
  writeFileSync(join(bravoDir, 'AGENTS.md'), '# bravo conventions')
  const nestedSkillDir = join(bravoDir, 'packages', 'x', '.claude', 'skills', 'deepskill')
  mkdirSync(nestedSkillDir, { recursive: true })
  writeFileSync(join(nestedSkillDir, 'SKILL.md'), '---\nname: deepskill\ndescription: nested\n---\nDeep capability')

  writeCodexSession(sessionsDir, 'alpha-session', alphaDir)
  writeCodexSession(sessionsDir, 'bravo-session', join(bravoDir, 'packages', 'x'))

  const launched = await launchBerthApp(dirs)
  app = launched.app
  page = launched.page
})

test.afterEach(async () => {
  await app?.close()
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

test('background queue deep-indexes non-active projects into the global scope (渐进补全)', async () => {
  await expect(page.locator('aside').getByRole('button', { name: /^(Project scope|项目范围)$/ })).toBeVisible()

  // Determinism: open the idle/AC gates (a battery-powered runner would defer the
  // queue by the retry window) and re-sync the queue via a fresh commit.
  await page.evaluate(async () => {
    await window.api.assets.setEngineSettings({ acOnlyFullScan: false, idleOnly: false })
    await window.api.assets.refresh({ wait: true })
  })

  // The deep-only surface appears WITHOUT any project activation:
  const nestedConvention = normalize(join(alphaDir, 'packages', 'sub', 'CLAUDE.md'))
  const nestedSkill = normalize(join(bravoDir, 'packages', 'x', '.claude', 'skills', 'deepskill', 'SKILL.md'))
  await expect.poll(() => snapshotPaths(), { timeout: 20_000 }).toContain(nestedConvention)
  await expect.poll(() => snapshotPaths(), { timeout: 20_000 }).toContain(nestedSkill)

  // Deep rows carry the owner tag (scope narrow-down keeps working).
  const owners = await deepOwners()
  expect(owners).toEqual(expect.arrayContaining([normalize(alphaDir), normalize(bravoDir)]))

  // Queue reaches done with N === M ≥ 2, and the global banner is gone (决策⑤).
  await expect.poll(async () => (await backgroundIndex())?.state, { timeout: 20_000 }).toBe('done')
  const terminal = (await backgroundIndex())!
  expect(terminal.totalProjects).toBeGreaterThanOrEqual(2)
  expect(terminal.indexedProjects).toBe(terminal.totalProjects)
  await expect(page.getByTestId('global-indexing-banner')).toHaveCount(0)

  // The deep skill is searchable from the global scope (看不到=没有 保护).
  await expect.poll(() => searchPaths('deepskill'), { timeout: 10_000 }).toContain(nestedSkill)
})

function normalize(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

async function snapshotPaths(): Promise<string[]> {
  return page.evaluate(async () => {
    const snap = (await window.api.assets.snapshot()) as { assets?: Array<{ path?: string }> }
    return (snap.assets ?? []).map((a) => String(a.path ?? '').replace(/\\/g, '/').toLowerCase())
  })
}

async function deepOwners(): Promise<string[]> {
  return page.evaluate(async () => {
    const snap = (await window.api.assets.snapshot()) as {
      assets?: Array<{ meta?: Record<string, unknown> }>
    }
    return [...new Set(
      (snap.assets ?? [])
        .filter((a) => a.meta?.scanDepth === 'deep')
        .map((a) => String(a.meta?.projectPath ?? '').replace(/\\/g, '/').toLowerCase())
    )]
  })
}

async function backgroundIndex(): Promise<{ state: string; indexedProjects: number; totalProjects: number } | undefined> {
  return page.evaluate(async () => {
    const status = (await window.api.assets.status()) as {
      backgroundIndex?: { state: string; indexedProjects: number; totalProjects: number }
    }
    return status.backgroundIndex
  })
}

async function searchPaths(query: string): Promise<string[]> {
  return page.evaluate(async (q) => {
    const results = (await window.api.assets.search(q)) as Array<{ asset?: { path?: string } }>
    return results.map((r) => String(r.asset?.path ?? '').replace(/\\/g, '/').toLowerCase())
  }, query)
}
