import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'
import { execFileSync } from 'child_process'
import { mkdirSync } from 'fs'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
  const userDataDir = testInfo.outputPath('user-data')
  mkdirSync(userDataDir, { recursive: true })

  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${userDataDir}`]
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterEach(async () => {
  await app.close()
})

test('Windows custom titlebar buttons are clickable', async () => {
  test.skip(process.platform !== 'win32', 'Windows titlebar hit testing is only meaningful on Windows')

  await expect(page.getByTestId('window-controls')).toBeVisible()

  const windowApiReady = await page.evaluate(() => {
    return (
      typeof window.api.window.minimize === 'function' &&
      typeof window.api.window.toggleMaximize === 'function' &&
      typeof window.api.window.close === 'function' &&
      typeof window.api.window.isMaximized === 'function'
    )
  })

  expect(windowApiReady).toBe(true)

  const maximizeButton = page.getByLabel('Maximize window')
  await expect(maximizeButton).toBeVisible()
  await realMouseClick(await centerOf(maximizeButton))

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
    .toBe(true)

  const restoreButton = page.getByLabel('Restore window')
  await expect(restoreButton).toBeVisible()
  await realMouseClick(await centerOf(restoreButton))

  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized()))
    .toBe(false)
})

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
  const processId = app.process()?.pid
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
  public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);
}
"@
$process = Get-Process -Id ${processId}
[MouseInput]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 120
[MouseInput]::SetCursorPos(${physicalPoint.x}, ${physicalPoint.y}) | Out-Null
Start-Sleep -Milliseconds 80
[MouseInput]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 80
[MouseInput]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
`
    ],
    { stdio: 'pipe' }
  )
}
