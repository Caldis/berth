import { ElectronAPI } from '@electron-toolkit/preload'
import type { ScanResult, SessionListResult, SessionDetailResult, HealthCheck } from '../shared/types/ipc'
import type { Asset, UsageSummary } from '../shared/types/asset'

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
    scan: (category?: string) => Promise<Asset[]>
    scanAll: () => Promise<ScanResult>
    get: (id: string) => Promise<Asset | null>
    search: (query: string) => Promise<unknown[]>
    healthCheck: () => Promise<HealthCheck[]>
    onChanged: (callback: (event: unknown) => void) => () => void
  }
  sessions: {
    list: (opts: { projectFilter?: string; limit?: number }) => Promise<SessionListResult>
    get: (id: string) => Promise<SessionDetailResult | null>
  }
  usage: {
    summary: (opts: { days: number }) => Promise<UsageSummary>
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
