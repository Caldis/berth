import { test, expect, type ElectronApplication, type Locator, type Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'

let app: ElectronApplication
let page: Page

type Box = {
  x: number
  y: number
  width: number
  height: number
}

const navNames = {
  overview: /^(Overview|总览)$/,
  sessions: /^(Sessions|会话)$/,
  memories: /^(Memories|记忆) - (Long-lived notes and sources|长期记忆与来源)$/,
  conventions: /^(Conventions|约定) - (Project rule files|项目规则文件)$/,
  skills: /^(Skills) - (Reusable workflows|可复用流程)$/,
  hooks: /^(Hooks) - (Lifecycle automation|生命周期自动化)$/,
  usage: /^(Usage|用量)$/
}

const navButton = (name: RegExp): Locator => page.locator('aside').getByRole('button', { name })
const settingsButton = (): Locator =>
  page.locator('aside').getByRole('button', { name: /^(Settings|设置)$/ })
const topNavigation = (): Locator => page.getByTestId('top-navigation')
const topBreadcrumb = (): Locator =>
  topNavigation().getByRole('navigation', {
    name: /^(Breadcrumb|面包屑)$/
  })

test.beforeAll(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'berth-e2e-'))

  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app?.close()
})

test.describe('App Shell', () => {
  test('window opens with correct title', async () => {
    const title = await page.title()
    expect(title).toBe('Berth')
  })

  test('sidebar is visible', async () => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('sidebar can be resized and collapsed without losing the shell layout', async () => {
    const sidebar = page.getByTestId('app-sidebar')
    const initialBox = await sidebar.boundingBox()
    expect(initialBox).not.toBeNull()

    const resizeHandle = page.locator('[role="separator"][aria-orientation="vertical"]')
    await expect(resizeHandle).toBeVisible()

    const handleBox = await resizeHandle.boundingBox()
    expect(handleBox).not.toBeNull()
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + 80)
    await page.mouse.down()
    await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 72, handleBox!.y + 80)
    await page.mouse.up()

    await expect
      .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
      .toBeGreaterThan(initialBox!.width + 30)

    await page.locator('aside').getByRole('button', { name: /^(Collapse sidebar|折叠侧边栏)$/ }).click()
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
      .toBeLessThan(90)

    await expect(resizeHandle).toHaveCount(0)

    await page.locator('aside').getByRole('button', { name: /^(Expand sidebar|展开侧边栏)$/ }).click()
    await expect(resizeHandle).toBeVisible()
    await expect
      .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
      .toBeGreaterThan(initialBox!.width + 30)
  })

  test('sidebar item spacing is consistent inside promoted instruction group', async () => {
    const itemBox = async (name: RegExp): Promise<Box> => {
      const box = await navButton(name).boundingBox()
      expect(box).not.toBeNull()
      return box!
    }

    // Instruction group order: conventions, memories, skills (GH-112 follow-up move).
    const conventions = await itemBox(navNames.conventions)
    const memories = await itemBox(navNames.memories)
    const skills = await itemBox(navNames.skills)

    const gapBetween = (previous: Box, next: Box): number => next.y - previous.y - previous.height

    const regularGap = gapBetween(conventions, memories)

    expect(gapBetween(memories, skills)).toBeCloseTo(regularGap, 0)
  })

  test('overview page loads by default', async () => {
    const heading = page.getByTestId('overview-hero').getByRole('heading', { name: /^(Overview|总览)$/ })
    await expect(heading).toBeVisible()
    await expect(heading).toContainText(/Overview|总览/)
    await expect(page.getByTestId('overview-hero')).toContainText(/Current agent|当前 Agent/)
    await expect(page.getByTestId('overview-hero')).toContainText(/Project scope|项目范围/)
    await expect(page.getByRole('region', { name: /Overview quick actions|总览快捷入口/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Health Checks|健康检查/ })).toBeVisible()
  })

  test('can navigate to sessions', async () => {
    await navButton(navNames.sessions).click()
    const heading = topNavigation().getByRole('heading', { name: /^(Sessions|会话)$/ })
    await expect(heading).toContainText(/Sessions|会话/)

    const breadcrumb = topBreadcrumb()
    await expect(breadcrumb).toContainText(/WORK|工作/)
  })

  test('can navigate to promoted instruction pages', async () => {
    await navButton(navNames.skills).click()
    const heading = topNavigation().getByRole('heading', { name: /^Skills$/ })
    await expect(heading).toContainText(/Skills/)
    const breadcrumb = topBreadcrumb()
    await expect(breadcrumb).toContainText(/INSTRUCTIONS|指令/)
  })

  test('can navigate to promoted capability pages', async () => {
    await navButton(navNames.hooks).click()
    const heading = topNavigation().getByRole('heading', { name: /^Hooks$/ })
    await expect(heading).toContainText(/Hooks/)
    const breadcrumb = topBreadcrumb()
    await expect(breadcrumb).toContainText(/CAPABILITIES|能力/)
  })

  test('can navigate to usage', async () => {
    await navButton(navNames.usage).click()
    const heading = topNavigation().getByRole('heading', { name: /^(Usage|用量)$/ })
    await expect(heading).toContainText(/Usage|用量/)
    const breadcrumb = topBreadcrumb()
    await expect(breadcrumb).toContainText(/RUN|运行/)
  })

  test('settings is not a regular navigation item', async () => {
    await expect(page.locator('aside nav').getByRole('button', { name: /^(Settings|设置)$/ })).toHaveCount(0)
  })

  test('can open settings dialog from sidebar footer', async () => {
    await settingsButton().click()
    const dialog = page.getByRole('dialog', { name: /^(Settings|设置)$/ })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test.describe('Theme', () => {
  test('can toggle theme via settings dialog', async () => {
    await settingsButton().click()
    const dialog = page.getByRole('dialog', { name: /^(Settings|设置)$/ })
    const darkBtn = dialog.getByRole('button', { name: /^(Dark|深色)$/ })
    if (await darkBtn.isVisible()) {
      await darkBtn.click()
      const html = page.locator('html')
      await expect(html).toHaveClass(/dark/)
    }
    await page.keyboard.press('Escape')
    // Wait for the modal to fully close so HeroUI/React Aria focus restoration
    // settles before the next test (otherwise it can steal focus from the
    // search dialog opened by the following Ctrl+K test).
    await expect(dialog).toBeHidden()
  })
})

test.describe('Search', () => {
  test('opens search dialog with keyboard shortcut', async () => {
    await page.keyboard.press('Control+k')
    const searchInput = page.locator('input[placeholder]').first()
    await expect(searchInput).toBeFocused()
    await page.keyboard.press('Escape')
  })
})

test.describe('Security', () => {
  test('no credential content is visible in the DOM', async () => {
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toMatch(/sk-ant-|Bearer |oauth_token/)
  })
})
