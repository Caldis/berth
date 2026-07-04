import { BrowserWindow, ipcMain } from 'electron'
import type { IpcMainInvokeEvent, WebContents } from 'electron'
import type { IpcChannels, IpcChannelArgs, IpcChannelResult, IpcEvents } from '@shared/types/ipc'
import { getMainLog } from '@berth/scan-engine/log'

// GH-154 T3/T4: IPC 出入两口的类型化单点。
// - handleIpc: 通道名/入参/返回从 IpcChannels 契约表推导 (补齐 GH-115 T1 预留的
//   "未来 handlers 类型化"), 并统一 sender 门禁 — 只有属于某个 BrowserWindow 的
//   主帧可调用 (纵深防御: sandbox/contextIsolation/导航封锁之上再挡子帧/非窗口来源)。
// - sendToWindow: 广播 payload 与 IpcEvents 表绑定, 吸收 isDestroyed 检查。

export function isTrustedIpcSender(event: IpcMainInvokeEvent): boolean {
  return (
    BrowserWindow.fromWebContents(event.sender) !== null &&
    event.senderFrame === event.sender.mainFrame
  )
}

export function handleIpc<C extends keyof IpcChannels>(
  channel: C,
  handler: (
    event: IpcMainInvokeEvent,
    ...args: IpcChannelArgs<C>
  ) => IpcChannelResult<C> | Promise<IpcChannelResult<C>>
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedIpcSender(event)) {
      getMainLog().log('ipc-guard', `denied untrusted sender on ${channel}`)
      throw new Error(`untrusted IPC sender for ${channel}`)
    }
    return handler(event, ...(args as IpcChannelArgs<C>))
  })
}

export function sendToWindow<E extends keyof IpcEvents>(
  target: { isDestroyed(): boolean; webContents: WebContents },
  channel: E,
  payload: IpcEvents[E]
): void {
  if (target.isDestroyed()) return
  target.webContents.send(channel, payload)
}
