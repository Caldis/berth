import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { execFileSync } from 'child_process'
import { prepareIsolatedDirs, launchBerthApp } from './launch'

let app: ElectronApplication
let page: Page

const windowControlNames = {
  maximize: /^(Maximize window|最大化窗口)$/,
  restore: /^(Restore window|还原窗口)$/
}

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  // Windows-only spec: skip BEFORE launching so non-win32 (macOS CI) never starts an
  // Electron app for tests that immediately skip. Launching it only to close it in
  // afterEach is what intermittently hung macOS worker teardown — a per-spec flaky
  // that got amplified into a run-level `pnpm test:e2e` failure (GH-139).
  test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')

  const dirs = prepareIsolatedDirs(testInfo.outputPath('window-controls-fixture'))

  const launched = await launchBerthApp(dirs)
  app = launched.app
  page = launched.page
})

test.afterEach(async () => {
  // `app` is only assigned on win32 (the beforeEach skip fires before launch elsewhere);
  // guard the close so an unset app can never hang teardown.
  const launchedApp: ElectronApplication | undefined = app
  if (launchedApp) await launchedApp.close()
})

test('Windows custom titlebar buttons toggle maximize through Electron', async () => {
  test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')

  await expect(page.getByTestId('window-controls')).toBeVisible()

  await expectWindowApiReady()

  const maximizeButton = page.getByLabel(windowControlNames.maximize)
  await expect(maximizeButton).toBeVisible()
  await maximizeButton.click()

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
    .toBe(true)

  const restoreButton = page.getByLabel(windowControlNames.restore)
  await expect(restoreButton).toBeVisible()
  await restoreButton.click()

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
    .toBe(false)
})

test('Windows custom titlebar pin toggles always-on-top through Electron', async () => {
  test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')

  await expect(page.getByTestId('window-controls')).toBeVisible()

  await expectWindowApiReady()

  const pinButton = page.getByLabel(/^(Pin window|固定窗口)$/)
  await expect(pinButton).toBeVisible()
  await expect(pinButton).toHaveAttribute('aria-pressed', 'false')
  await pinButton.click()

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()))
    .toBe(true)

  const unpinButton = page.getByLabel(/^(Unpin window|取消固定窗口)$/)
  await expect(unpinButton).toHaveAttribute('aria-pressed', 'true')
  await unpinButton.click()

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop()))
    .toBe(false)
})

test.describe('native mouse hit testing', () => {
  test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')
  test.skip(process.env.CI === 'true', 'Hosted Windows runners do not expose stable foreground window clicks')

  test('Windows custom titlebar buttons accept real OS mouse clicks', async () => {
    await expect(page.getByTestId('window-controls')).toBeVisible()

    await expectWindowApiReady()

    const maximizeButton = page.getByLabel(windowControlNames.maximize)
    await expect(maximizeButton).toBeVisible()
    await realMouseClick(await centerOf(maximizeButton))

    await expect
      .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
      .toBe(true)

    const restoreButton = page.getByLabel(windowControlNames.restore)
    await expect(restoreButton).toBeVisible()
    await realMouseClick(await centerOf(restoreButton))

    await expect
      .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
      .toBe(false)
  })
})

async function expectWindowApiReady(): Promise<void> {
  const windowApiReady = await page.evaluate(() => {
    return (
      typeof window.api.window.minimize === 'function' &&
      typeof window.api.window.toggleMaximize === 'function' &&
      typeof window.api.window.close === 'function' &&
      typeof window.api.window.isMaximized === 'function' &&
      typeof window.api.window.setAlwaysOnTop === 'function' &&
      typeof window.api.window.isAlwaysOnTop === 'function'
    )
  })

  expect(windowApiReady).toBe(true)
}

async function centerOf(locator: ReturnType<Page['getByLabel']>): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return {
    x: Math.round(box!.x + box!.width / 2),
    y: Math.round(box!.y + box!.height / 2)
  }
}

async function realMouseClick(point: { x: number; y: number }): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    window.show()
    window.focus()
  })

  const windowBounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
  const nativeWindowHandle = await app.evaluate(({ BrowserWindow }) =>
    Array.from(BrowserWindow.getAllWindows()[0].getNativeWindowHandle())
  )
  const hwnd = nativeWindowHandleToDecimal(nativeWindowHandle)
  const physicalPoint = {
    x: windowBounds.x + point.x,
    y: windowBounds.y + point.y
  }

  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class MouseInput {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);
}
"@
$hwnd = [IntPtr]${hwnd}
$HWND_TOPMOST = [IntPtr](-1)
$HWND_NOTOPMOST = [IntPtr](-2)
$SW_SHOW = 5
$SWP_NOSIZE = 0x0001
$SWP_NOMOVE = 0x0002
$SWP_SHOWWINDOW = 0x0040
[MouseInput]::ShowWindow($hwnd, $SW_SHOW) | Out-Null
[MouseInput]::SetWindowPos($hwnd, $HWND_TOPMOST, 0, 0, 0, 0, $SWP_NOSIZE -bor $SWP_NOMOVE -bor $SWP_SHOWWINDOW) | Out-Null
Start-Sleep -Milliseconds 100
[MouseInput]::BringWindowToTop($hwnd) | Out-Null
[MouseInput]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 200
[MouseInput]::SetCursorPos(${physicalPoint.x}, ${physicalPoint.y}) | Out-Null
Start-Sleep -Milliseconds 120
[MouseInput]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 120
[MouseInput]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
[MouseInput]::SetWindowPos($hwnd, $HWND_NOTOPMOST, 0, 0, 0, 0, $SWP_NOSIZE -bor $SWP_NOMOVE -bor $SWP_SHOWWINDOW) | Out-Null
`
    ],
    { stdio: 'pipe' }
  )
}

function nativeWindowHandleToDecimal(bytes: number[]): string {
  return bytes
    .slice(0, 8)
    .reduce((value, byte, index) => value + (BigInt(byte) << BigInt(index * 8)), 0n)
    .toString()
}
