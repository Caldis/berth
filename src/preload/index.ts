import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
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
    list: (opts: { projectFilter?: string; limit?: number }) =>
      ipcRenderer.invoke('sessions:list', opts),
    get: (id: string) => ipcRenderer.invoke('sessions:get', id)
  },
  usage: {
    summary: (opts: { days: number }) => ipcRenderer.invoke('usage:summary', opts)
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
