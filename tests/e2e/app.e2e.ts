import { test, expect, ElectronApplication, Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js')],
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

  test('overview page loads by default', async () => {
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('can navigate to sessions', async () => {
    await page.click('button:has-text("Sessions")')
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Sessions|会话/)
  })

  test('can navigate to instructions', async () => {
    await page.click('button:has-text("Instructions")')
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Instructions|指令/)
  })

  test('can navigate to capabilities', async () => {
    await page.click('button:has-text("Capabilities")')
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Capabilities|能力/)
  })

  test('can navigate to usage', async () => {
    await page.click('button:has-text("Usage")')
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Usage|用量/)
  })

  test('can navigate to settings', async () => {
    await page.click('button:has-text("Settings")')
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Settings|设置/)
  })
})

test.describe('Theme', () => {
  test('can toggle theme via settings', async () => {
    await page.click('button:has-text("Settings")')
    const darkBtn = page.locator('button:has-text("Dark")')
    if (await darkBtn.isVisible()) {
      await darkBtn.click()
      const html = page.locator('html')
      await expect(html).toHaveClass(/dark/)
    }
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
