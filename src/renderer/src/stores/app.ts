import { create } from 'zustand'
import {
  DEFAULT_SCOPE_SELECTION,
  mergeProjectScopeCandidates,
  normalizeScopeSelection,
  type AppScopeSelection,
  type ProjectScopeCandidate
} from '@shared/scope'
import type { AgentView, Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'
import type { AssetRuntimeStatus, AssetSnapshot, ScanError } from '@shared/types/ipc'

export const SIDEBAR_COLLAPSED_WIDTH = 64
export const SIDEBAR_DEFAULT_WIDTH = 248
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 360

export const EMPTY_ASSET_STATS: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
}

export const IDLE_ASSET_RUNTIME_STATUS: AssetRuntimeStatus = {
  state: 'idle',
  stale: false
}

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(width)))
}

interface AppState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  agentView: AgentView
  setAgentView: (agentView: AgentView) => void

  scopeSelection: AppScopeSelection
  projectCandidates: ProjectScopeCandidate[]
  setScopeSelection: (selection: Partial<AppScopeSelection>) => void
  setProjectCandidates: (candidates: ProjectScopeCandidate[]) => void

  assets: Asset[]
  setAssets: (assets: Asset[]) => void

  stats: AssetStats
  setStats: (stats: AssetStats) => void

  assetRuntimeStatus: AssetRuntimeStatus
  assetSnapshotId: string | null
  assetErrors: ScanError[]
  lastAssetRefreshAt: string | null
  setAssetRuntimeStatus: (status: AssetRuntimeStatus) => void
  setAssetSnapshot: (snapshot: AssetSnapshot) => void

  recentSessions: SessionSummary[]
  setRecentSessions: (sessions: SessionSummary[]) => void

  usageSummary: UsageSummary | null
  setUsageSummary: (usage: UsageSummary) => void

  scanning: boolean
  setScanning: (scanning: boolean) => void

  agentDetected: boolean
  setAgentDetected: (detected: boolean) => void

  inspectorOpen: boolean
  inspectorPath: string | null
  inspectorContent: string | null
  openInspector: (path: string, content: string) => void
  closeInspector: () => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: clampSidebarWidth(sidebarWidth) }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  agentView: 'all',
  setAgentView: (agentView) => set({ agentView }),

  scopeSelection: DEFAULT_SCOPE_SELECTION,
  projectCandidates: [],
  setScopeSelection: (scopeSelection) => set({ scopeSelection: normalizeScopeSelection(scopeSelection) }),
  setProjectCandidates: (projectCandidates) => set({ projectCandidates: mergeProjectScopeCandidates(projectCandidates) }),

  assets: [],
  setAssets: (assets) => set({ assets }),

  stats: EMPTY_ASSET_STATS,
  setStats: (stats) => set({ stats }),

  assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
  assetSnapshotId: null,
  assetErrors: [],
  lastAssetRefreshAt: null,
  setAssetRuntimeStatus: (assetRuntimeStatus) => set((state) => ({
    assetRuntimeStatus,
    scanning: assetRuntimeStatus.state === 'scanning',
    lastAssetRefreshAt: assetRuntimeStatus.lastCompletedAt ?? state.lastAssetRefreshAt
  })),
  setAssetSnapshot: (snapshot) => set((state) => ({
    assets: snapshot.assets,
    stats: snapshot.stats,
    projectCandidates: mergeProjectScopeCandidates(snapshot.projectCandidates),
    assetRuntimeStatus: snapshot.status,
    assetSnapshotId: snapshot.id,
    assetErrors: snapshot.errors,
    scanning: snapshot.status.state === 'scanning',
    lastAssetRefreshAt: snapshot.status.lastCompletedAt ?? state.lastAssetRefreshAt
  })),

  recentSessions: [],
  setRecentSessions: (recentSessions) => set({ recentSessions }),

  usageSummary: null,
  setUsageSummary: (usageSummary) => set({ usageSummary }),

  scanning: false,
  setScanning: (scanning) => set({ scanning }),

  agentDetected: false,
  setAgentDetected: (agentDetected) => set({ agentDetected }),

  inspectorOpen: false,
  inspectorPath: null,
  inspectorContent: null,
  openInspector: (path, content) => set({ inspectorOpen: true, inspectorPath: path, inspectorContent: content }),
  closeInspector: () => set({ inspectorOpen: false, inspectorPath: null, inspectorContent: null })
}))
