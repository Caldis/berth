import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setMainLogWriter } from '@berth/scan-engine/log'

// GH-154 T3: typed-ipc — handleIpc 把 45 通道绑定到 IpcChannels 契约表 (编译期),
// 并在运行时统一 sender 门禁: 只有属于某个 BrowserWindow 的主帧可调用特权通道。

type Listener = (event: unknown, ...args: unknown[]) => unknown
const registered = new Map<string, Listener>()
const fromWebContents = vi.fn<(wc: unknown) => unknown>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      registered.set(channel, listener)
    }
  },
  BrowserWindow: {
    fromWebContents: (wc: unknown) => fromWebContents(wc)
  }
}))

function fakeEvent(options: { topFrame?: boolean } = {}): { sender: { mainFrame: object }; senderFrame: object | null } {
  const mainFrame = {}
  return {
    sender: { mainFrame },
    senderFrame: options.topFrame === false ? {} : mainFrame
  }
}

describe('handleIpc (GH-154 T3)', () => {
  const logLines: string[] = []

  beforeEach(() => {
    registered.clear()
    fromWebContents.mockReset()
    logLines.length = 0
    setMainLogWriter({ log: (scope, err) => logLines.push(`${scope} ${String(err)}`), info: () => {} })
  })

  it('passes a trusted top-frame sender through with args and result', async () => {
    const { handleIpc } = await import('../../src/main/ipc/typed-ipc')
    fromWebContents.mockReturnValue({})
    const handler = vi.fn(() => true)
    handleIpc('window:is-maximized', handler)

    const listener = registered.get('window:is-maximized')
    expect(listener).toBeDefined()
    await expect(Promise.resolve(listener!(fakeEvent()))).resolves.toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('rejects a sub-frame sender and leaves a log trace', async () => {
    const { handleIpc } = await import('../../src/main/ipc/typed-ipc')
    fromWebContents.mockReturnValue({})
    const handler = vi.fn(() => true)
    handleIpc('window:is-maximized', handler)

    const listener = registered.get('window:is-maximized')!
    expect(() => listener(fakeEvent({ topFrame: false }))).toThrow(/untrusted/i)
    expect(handler).not.toHaveBeenCalled()
    expect(logLines.some((line) => line.includes('ipc-guard'))).toBe(true)
  })

  it('rejects a sender that belongs to no BrowserWindow', async () => {
    const { handleIpc } = await import('../../src/main/ipc/typed-ipc')
    fromWebContents.mockReturnValue(null)
    const handler = vi.fn(() => true)
    handleIpc('window:is-maximized', handler)

    const listener = registered.get('window:is-maximized')!
    expect(() => listener(fakeEvent())).toThrow(/untrusted/i)
    expect(handler).not.toHaveBeenCalled()
  })

  it('forwards channel args to the handler (typed at compile time)', async () => {
    const { handleIpc } = await import('../../src/main/ipc/typed-ipc')
    fromWebContents.mockReturnValue({})
    const handler = vi.fn((_event: unknown, flag: boolean) => {
      expect(flag).toBe(true)
    })
    handleIpc('window:set-always-on-top', handler as never)

    const listener = registered.get('window:set-always-on-top')!
    listener(fakeEvent(), true)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
