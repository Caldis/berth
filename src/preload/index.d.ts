import { ElectronAPI } from '@electron-toolkit/preload'

interface PlatformInfo {
  platform: NodeJS.Platform
  arch: string
  homeDir: string
  version: string
}

interface BerthAPI {
  platform: {
    info: () => Promise<PlatformInfo>
  }
  theme: {
    get: () => Promise<string>
    set: (theme: string) => Promise<void>
  }
  assets: {
    scan: (category?: string) => Promise<unknown[]>
    get: (id: string) => Promise<unknown>
    search: (query: string) => Promise<unknown[]>
    onChanged: (callback: (event: unknown) => void) => () => void
  }
  shell: {
    openPath: (path: string) => Promise<void>
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: BerthAPI
  }
}
