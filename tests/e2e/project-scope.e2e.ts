import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { prepareIsolatedDirs, launchBerthApp } from './launch'

let app: ElectronApplication
let page: Page
let tempDir: string

// GH-117: 原 darwin skip 已移除 — "macOS 失败" 实为 fixture 未隔离 HOME 时扫到宿主
// ~/.claude 数据, activate 链路超出断言窗口; 三隔离根 (launch.ts) 后全平台确定性运行。

const projectScopeButton = (): Locator =>
  page.locator('aside').getByRole('button', { name: /^(Project scope|项目范围)$/ })

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  tempDir = testInfo.outputPath('project-scope-fixture')
  const dirs = prepareIsolatedDirs(tempDir)
  const projectDir = join(tempDir, 'e2e-project')
  const projectCwd = join(projectDir, 'packages', 'app')
  const sessionsDir = join(dirs.codexHome, 'sessions')
  const skillDir = join(projectDir, '.agents', 'skills', 'e2e-skill')

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

  const launched = await launchBerthApp(dirs)
  app = launched.app
  page = launched.page
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
  const listbox = page.getByRole('listbox', { name: /^(Project scope options|项目范围选项)$/ })
  const option = listbox.getByRole('option', { name: 'app' })
  await expect(option).toBeVisible()
  // GH-117 AC-3: 隔离生效断言 — 仅 Global/User/app 三项; 宿主 ~/.claude 数据
  // 一旦再泄入 (隔离被破坏), 此处立刻红, 防止测试退化回"依赖宿主清洁度"。
  await expect(listbox.getByRole('option')).toHaveCount(3)
  await option.click()

  await expect(trigger).toContainText('app')
  await expect.poll(() => hasSearchResult('e2e-skill')).toBe(true)

  await trigger.click()
  await page
    .getByRole('listbox', { name: /^(Project scope options|项目范围选项)$/ })
    .getByRole('option', { name: /^(User|用户域)$/ })
    .click()

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
