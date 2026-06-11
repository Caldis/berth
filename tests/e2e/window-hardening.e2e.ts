import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { prepareIsolatedDirs, launchBerthApp } from './launch'

// GH-119: window-hardening behavior net. e2e runs the out/ build (prod shape:
// no ELECTRON_RENDERER_URL), which is exactly the strictest guard form —
// will-navigate blocks everything, window.open is deny-only, permissions are
// deny-all except clipboard-sanitized-write (clipboard itself needs a user
// gesture, so its allow path is verified manually, not here).
let app: ElectronApplication
let page: Page

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  const dirs = prepareIsolatedDirs(testInfo.outputPath('window-hardening-fixture'))
  const launched = await launchBerthApp(dirs)
  app = launched.app
  page = launched.page
})

test.afterEach(async () => {
  await app.close()
})

test('renderer runs sandboxed (webPreferences.sandbox=true reaches the window)', async () => {
  const sandboxed = await app.evaluate(({ BrowserWindow }) => {
    // getLastWebPreferences exists at runtime but is missing from Electron's
    // published types — narrow locally instead of dropping this direct pin
    // (behavior-level e2e stays green even if sandbox flips back to false).
    const webContents = BrowserWindow.getAllWindows()[0].webContents as unknown as {
      getLastWebPreferences(): { sandbox?: boolean } | undefined
    }
    return webContents.getLastWebPreferences()?.sandbox === true
  })
  expect(sandboxed).toBe(true)
})

test('will-navigate blocks page-initiated navigation in prod', async () => {
  const initialUrl = page.url()
  expect(initialUrl).toContain('index.html')

  await page.evaluate(() => {
    window.location.href = 'https://example.com/'
  })
  // The guard preventDefaults synchronously; give a real navigation enough
  // time that this would observably flip the URL if it ever went through.
  await page.waitForTimeout(500)

  expect(page.url()).toBe(initialUrl)
  // The SPA must still be alive and bridged after the blocked attempt.
  const apiAlive = await page.evaluate(() => typeof window.api.platform.info === 'function')
  expect(apiAlive).toBe(true)
})

test('window.open with a non-safe URL is denied and opens no window', async () => {
  const opened = await page.evaluate(() => {
    const handle = window.open('file:///denied-by-guard', '_blank')
    return handle !== null
  })
  expect(opened).toBe(false)

  const windowCount = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)
  expect(windowCount).toBe(1)
})

test('permissions are denied by default (geolocation query reports denied)', async () => {
  const state = await page.evaluate(async () => {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state
  })
  expect(state).toBe('denied')
})

test('CSP meta carries the hardening directives', async () => {
  const csp = await page.evaluate(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')
    return meta?.content ?? ''
  })
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain("base-uri 'none'")
  expect(csp).toContain("form-action 'none'")
})
