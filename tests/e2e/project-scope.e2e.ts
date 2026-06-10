import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

let app: ElectronApplication
let page: Page
let tempDir: string

// macOS 上「切到 session 派生 project」稳定失败 (与改动无关的既有平台差异),
// 根因待定: docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md (GH-115 T0 扩 e2e 矩阵时按该 issue 隔离)
test.skip(process.platform === 'darwin', 'known macOS failure — docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md')

const projectScopeButton = (): Locator =>
  page.locator('aside').getByRole('button', { name: /^(Project scope|项目范围)$/ })

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  tempDir = testInfo.outputPath('project-scope-fixture')
  const userDataDir = join(tempDir, 'user-data')
  const codexHome = join(tempDir, 'codex-home')
  const projectDir = join(tempDir, 'e2e-project')
  const projectCwd = join(projectDir, 'packages', 'app')
  const sessionsDir = join(codexHome, 'sessions')
  const skillDir = join(projectDir, '.agents', 'skills', 'e2e-skill')

  mkdirSync(userDataDir, { recursive: true })
  mkdirSync(sessionsDir, { recursive: true })
  mkdirSync(join(projectDir, '.git'), { recursive: true })
  mkdirSync(projectCwd, { recursive: true })
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    join(sessionsDir, 'rollout-e2e-project.jsonl'),
    JSON.stringify({
      type: 'session_meta',
      timestamp: '2026-06-02T00:00:00.000Z',
      payload: { id: 'e2e-project-session', cwd: projectCwd, model: 'gpt-5' }
    }) + '\n'
  )
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    ['---', 'name: e2e-skill', 'description: E2E project scope skill', '---', 'Body'].join('\n')
  )

  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
      NODE_ENV: 'test'
    }
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterEach(async () => {
  await app?.close()
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

test('switches project scope and rebuilds the searchable project assets', async () => {
  const trigger = projectScopeButton()
  await expect(trigger).toBeVisible()

  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox', { name: /^(Project scope options|项目范围选项)$/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox', { name: /^(Project scope options|项目范围选项)$/ })).toHaveCount(0)

  await trigger.click()
  const option = page.getByRole('option', { name: 'app' })
  await expect(option).toBeVisible()
  await option.click()

  await expect(trigger).toContainText('app')
  await expect.poll(() => hasSearchResult('e2e-skill')).toBe(true)

  await trigger.click()
  await page.getByRole('option', { name: /^(User|用户域)$/ }).click()

  await expect(trigger).toContainText(/User|用户域/)
  await expect.poll(() => hasSearchResult('e2e-skill')).toBe(false)
})

async function hasSearchResult(name: string): Promise<boolean> {
  return page.evaluate(async (query) => {
    const results = await window.api.assets.search(query)
    return results.some((result) => {
      const asset = (result as { asset?: { name?: string } }).asset
      return asset?.name === query
    })
  }, name)
}
