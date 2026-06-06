import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AgentScanSourceGroup,
  AssetRuntimeStatus,
  AssetScanPartial,
  AssetSnapshot,
  ScanResult,
  SearchResult,
  SessionListResult,
  SessionDetailResult,
  HealthCheck,
  HooksAgentId,
  HooksEnablementStatus,
  ProjectScopeActivationResult,
  SetHookEnabledRequest,
  SetHookEnabledResult,
  SetHooksEnabledRequest,
  SetHooksEnabledResult
} from '../shared/types/ipc'
import type { AgentView, Asset, CostMode, UsageSummary } from '../shared/types/asset'
import type { AgentCapabilityPluginListResult } from '../shared/types/agent-plugin'
import type { MemoryListResult, MemoryNote } from '../shared/types/memory'
import type { AppScopeSelection, ProjectScopeCandidate } from '../shared/scope'

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
    setAlwaysOnTop: (flag: boolean) => Promise<void>
    isAlwaysOnTop: () => Promise<boolean>
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
    snapshot: () => Promise<AssetSnapshot>
    status: () => Promise<AssetRuntimeStatus>
    refresh: (opts?: { wait?: boolean }) => Promise<AssetRuntimeStatus>
    scan: (category?: string) => Promise<Asset[]>
    scanAll: () => Promise<ScanResult>
    scanSources: () => Promise<AgentScanSourceGroup[]>
    get: (id: string) => Promise<Asset | null>
    search: (query: string) => Promise<SearchResult[]>
    healthCheck: (opts?: { refresh?: boolean }) => Promise<HealthCheck[]>
    onChanged: (callback: (event: unknown) => void) => () => void
    onProgress: (
      callback: (payload: { status: AssetRuntimeStatus; partial?: AssetScanPartial }) => void
    ) => () => void
  }
  agentPlugins: {
    list: () => Promise<AgentCapabilityPluginListResult>
  }
  projectScope: {
    candidates: () => Promise<ProjectScopeCandidate[]>
    activate: (opts: { projectPath?: string }) => Promise<ProjectScopeActivationResult>
    setScope: (selection: AppScopeSelection) => Promise<{ applied: boolean }>
  }
  sessions: {
    list: (opts: { projectFilter?: string; projectPath?: string; limit?: number; agentView?: AgentView }) => Promise<SessionListResult>
    get: (id: string) => Promise<SessionDetailResult | null>
  }
  usage: {
    summary: (opts: { days: number; agentView?: AgentView; costMode?: CostMode; projectPath?: string }) => Promise<UsageSummary>
  }
  memory: {
    list: () => Promise<MemoryListResult>
    get: (id: string) => Promise<MemoryNote | null>
  }
  hooks: {
    status: (agentId: HooksAgentId) => Promise<HooksEnablementStatus>
    statuses: (agentId: HooksAgentId) => Promise<HooksEnablementStatus[]>
    setEnabled: (request: SetHooksEnabledRequest) => Promise<SetHooksEnabledResult>
    setHookEnabled: (request: SetHookEnabledRequest) => Promise<SetHookEnabledResult>
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
