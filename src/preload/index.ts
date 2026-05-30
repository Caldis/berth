import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const handler = (_event: unknown, maximized: boolean): void => callback(maximized)
      ipcRenderer.on('window:maximized-change', handler)
      return () => ipcRenderer.removeListener('window:maximized-change', handler)
    }
  },
  platform: {
    info: () => ipcRenderer.invoke('platform:info')
  },
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: string) => ipcRenderer.invoke('theme:set', theme)
  },
  assets: {
    scan: (category?: string) => ipcRenderer.invoke('assets:scan', category),
    scanAll: () => ipcRenderer.invoke('assets:scan-all'),
    scanSources: () => ipcRenderer.invoke('assets:scan-sources'),
    get: (id: string) => ipcRenderer.invoke('assets:get', id),
    search: (query: string) => ipcRenderer.invoke('assets:search', query),
    healthCheck: () => ipcRenderer.invoke('assets:health-check'),
    onChanged: (callback: (event: unknown) => void) => {
      const handler = (_: unknown, event: unknown): void => callback(event)
      ipcRenderer.on('assets:changed', handler)
      return () => ipcRenderer.removeListener('assets:changed', handler)
    }
  },
  sessions: {
    list: (opts: { projectFilter?: string; limit?: number; agentView?: string }) =>
      ipcRenderer.invoke('sessions:list', opts),
    get: (id: string) => ipcRenderer.invoke('sessions:get', id)
  },
  usage: {
    summary: (opts: { days: number; agentView?: string }) => ipcRenderer.invoke('usage:summary', opts)
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error fallback for non-isolated context
  window.api = api
}
