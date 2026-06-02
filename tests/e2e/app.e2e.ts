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
  instructions: /^(Instructions|指令)$/,
  capabilities: /^(Capabilities|能力)$/,
  usage: /^(Usage|用量)$/
}

const navButton = (name: RegExp): Locator => page.locator('aside').getByRole('button', { name })
const settingsButton = (): Locator =>
  page.locator('aside').getByRole('button', { name: /^(Settings|设置)$/ })

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

  test('sidebar item spacing is consistent inside configuration group', async () => {
    const itemBox = async (name: RegExp): Promise<Box> => {
      const box = await navButton(name).boundingBox()
      expect(box).not.toBeNull()
      return box!
    }

    const overview = await itemBox(navNames.overview)
    const sessions = await itemBox(navNames.sessions)
    const instructions = await itemBox(navNames.instructions)
    const capabilities = await itemBox(navNames.capabilities)
    const usage = await itemBox(navNames.usage)

    const gapBetween = (previous: Box, next: Box): number => next.y - previous.y - previous.height

    const regularGap = gapBetween(overview, sessions)

    expect(gapBetween(instructions, capabilities)).toBeCloseTo(regularGap, 0)
    expect(gapBetween(capabilities, usage)).toBeCloseTo(regularGap, 0)
  })

  test('overview page loads by default', async () => {
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('can navigate to sessions', async () => {
    await navButton(navNames.sessions).click()
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Sessions|会话/)

    const breadcrumb = page.getByTestId('top-navigation').getByRole('navigation', {
      name: /^(Breadcrumb|面包屑)$/
    })
    await expect(breadcrumb).toContainText(/Sessions|会话/)
  })

  test('can navigate to instructions', async () => {
    await navButton(navNames.instructions).click()
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Instructions|指令/)
  })

  test('can navigate to capabilities', async () => {
    await navButton(navNames.capabilities).click()
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Capabilities|能力/)
  })

  test('can navigate to usage', async () => {
    await navButton(navNames.usage).click()
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Usage|用量/)
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
