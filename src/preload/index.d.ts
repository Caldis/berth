import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AgentScanSourceGroup,
  ScanResult,
  SessionListResult,
  SessionDetailResult,
  HealthCheck,
  HooksAgentId,
  HooksEnablementStatus,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '../shared/types/ipc'
import type { AgentView, Asset, CostMode, UsageSummary } from '../shared/types/asset'
import type { MemoryListResult, MemoryNote } from '../shared/types/memory'

interface PlatformInfo {
  platform: NodeJS.Platform
  arch: string
  homeDir: string
  version: string
}

interface BerthAPI {
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  }
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
    scanSources: () => Promise<AgentScanSourceGroup[]>
    get: (id: string) => Promise<Asset | null>
    search: (query: string) => Promise<unknown[]>
    healthCheck: () => Promise<HealthCheck[]>
    onChanged: (callback: (event: unknown) => void) => () => void
  }
  sessions: {
    list: (opts: { projectFilter?: string; limit?: number; agentView?: AgentView }) => Promise<SessionListResult>
    get: (id: string) => Promise<SessionDetailResult | null>
  }
  usage: {
    summary: (opts: { days: number; agentView?: AgentView; costMode?: CostMode }) => Promise<UsageSummary>
  }
  memory: {
    list: () => Promise<MemoryListResult>
    get: (id: string) => Promise<MemoryNote | null>
  }
  hooks: {
    status: (agentId: HooksAgentId) => Promise<HooksEnablementStatus>
    setEnabled: (request: SetHooksEnabledRequest) => Promise<SetHooksEnabledResult>
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
