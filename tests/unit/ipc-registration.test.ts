import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// GH-115 T10b: 注册层薄测试 — handlers 此前因顶层 import electron 全仓零触达。
// vi.mock('electron') 后真实加载注册函数, 断言运行时注册集合 == IpcChannels 契约表
// (与文本对账 ipc-contract.test.ts 互补: 这里是运行时事实, 那里是源码事实)。

const registered: string[] = []

vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string) => registered.push(channel) },
  BrowserWindow: { fromWebContents: () => null },
  nativeTheme: { themeSource: 'system' },
  shell: { showItemInFolder: () => {}, openExternal: () => {} },
  app: { getVersion: () => '0.0.0-test', getPath: () => '/tmp' }
}))

describe('registerAllHandlers', () => {
  it('运行时注册集合 == IpcChannels 契约表键集', async () => {
    const { registerAllHandlers } = await import('../../src/main/ipc')
    registerAllHandlers()

    const ipcTypes = readFileSync(resolve(__dirname, '../../src/shared/types/ipc.ts'), 'utf8')
    const declared = [...ipcTypes.matchAll(/^\s{2}'([a-zA-Z-]+:[a-zA-Z-]+)':\s*\{\s*args:/gm)]
      .map((m) => m[1])
      .sort()

    expect([...registered].sort()).toEqual(declared)
  })
})
