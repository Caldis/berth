import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppScopeSelection } from '@shared/scope'
import type { IpcChannels, IpcChannelArgs, IpcChannelResult, IpcEvents } from '@shared/types/ipc'

// GH-115 T1: 通道调用一律经 typed invoke — 通道名/参数/返回值由 shared/types/ipc.ts 的
// IpcChannels 表约束; window.api 的类型唯一来源是文末导出的 BerthAPI = typeof api。
const invoke = <C extends keyof IpcChannels>(
  channel: C,
  ...args: IpcChannelArgs<C>
): Promise<IpcChannelResult<C>> => ipcRenderer.invoke(channel, ...args)

const subscribe = <E extends keyof IpcEvents>(
  event: E,
  callback: (payload: IpcEvents[E]) => void
): (() => void) => {
  const handler = (_event: unknown, payload: IpcEvents[E]): void => callback(payload)
  ipcRenderer.on(event, handler)
  return () => ipcRenderer.removeListener(event, handler)
}

const api = {
  window: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:toggle-maximize'),
    close: () => invoke('window:close'),
    isMaximized: () => invoke('window:is-maximized'),
    setAlwaysOnTop: (flag: boolean) => invoke('window:set-always-on-top', flag),
    isAlwaysOnTop: () => invoke('window:is-always-on-top'),
    onMaximizedChange: (callback: (maximized: boolean) => void) =>
      subscribe('window:maximized-change', callback)
  },
  platform: {
    info: () => invoke('platform:info')
  },
  theme: {
    set: (theme: 'light' | 'dark' | 'system') => invoke('theme:set', theme)
  },
  assets: {
    snapshot: () => invoke('assets:snapshot'),
    status: () => invoke('assets:status'),
    refresh: (opts?: { wait?: boolean }) => invoke('assets:refresh', opts),
    scanSources: () => invoke('assets:scan-sources'),
    get: (id: string) => invoke('assets:get', id),
    search: (query: string) => invoke('assets:search', query),
    healthCheck: (opts?: { refresh?: boolean }) => invoke('assets:health-check', opts),
    onChanged: (callback: (event: IpcEvents['assets:changed']) => void) =>
      subscribe('assets:changed', callback),
    onProgress: (callback: (payload: IpcEvents['assets:progress']) => void) =>
      subscribe('assets:progress', callback)
  },
  agentPlugins: {
    list: () => invoke('agent-plugins:list')
  },
  projectScope: {
    candidates: () => invoke('project-scope:candidates'),
    activate: (opts: { projectPath?: string }) => invoke('project-scope:activate', opts),
    setScope: (selection: AppScopeSelection) => invoke('project-scope:set-scope', selection)
  },
  sessions: {
    list: (opts: IpcChannelArgs<'sessions:list'>[0]) => invoke('sessions:list', opts),
    get: (id: string) => invoke('sessions:get', id),
    events: (id: string) => invoke('sessions:events', id),
    eventPayload: (id: string, eventId: string) => invoke('sessions:event-payload', id, eventId)
  },
  usage: {
    summary: (opts: IpcChannelArgs<'usage:summary'>[0]) => invoke('usage:summary', opts)
  },
  memory: {
    list: () => invoke('memory:list'),
    get: (id: string) => invoke('memory:get', id)
  },
  teams: {
    list: () => invoke('teams:list')
  },
  hooks: {
    setHookEnabled: (request: IpcChannelArgs<'hooks:set-hook-enabled'>[0]) =>
      invoke('hooks:set-hook-enabled', request)
  },
  shell: {
    openPath: (path: string) => invoke('shell:openPath', path),
    openExternal: (url: string) => invoke('shell:openExternal', url)
  },
  update: {
    check: () => invoke('update:check'),
    download: () => invoke('update:download'),
    install: () => invoke('update:install'),
    getPreferences: () => invoke('update:get-preferences'),
    setPreferences: (prefs: IpcChannelArgs<'update:set-preferences'>[0]) =>
      invoke('update:set-preferences', prefs),
    onState: (callback: (state: IpcEvents['update:state']) => void) =>
      subscribe('update:state', callback)
  }
}

/** window.api 的类型唯一来源 (index.d.ts 据此声明全局类型, 禁止手写方法签名)。 */
export type BerthAPI = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // 非隔离 fallback。同名 index.d.ts 的全局 Window 增强在本文件内不可见 (同基名遮蔽), 显式断言。
  const target = window as unknown as { electron: typeof electronAPI; api: BerthAPI }
  target.electron = electronAPI
  target.api = api
}
