import { create } from 'zustand'
import {
  DEFAULT_SCOPE_SELECTION,
  mergeProjectScopeCandidates,
  normalizeScopeSelection,
  type AppScopeSelection,
  type ProjectScopeCandidate
} from '@shared/scope'
import type { AgentView, Asset, AssetStats } from '@shared/types/asset'
import type { AssetRuntimeStatus, AssetScanPartial, AssetSnapshot, ScanError, UpdateState } from '@shared/types/ipc'

// Wide enough to clear the macOS traffic-light cluster (x:16 + ~3×18px ≈ 70px),
// so a collapsed sidebar fully contains the buttons instead of letting them spill
// onto the content area's header (GH-135).
export const SIDEBAR_COLLAPSED_WIDTH = 80
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
  subagents: 0
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


  scopeSelection: AppScopeSelection
  projectCandidates: ProjectScopeCandidate[]
  setScopeSelection: (selection: Partial<AppScopeSelection>) => void
  setProjectCandidates: (candidates: ProjectScopeCandidate[]) => void

  // GH-138: 全局 agent 维度过滤 (与 scopeSelection 正交)。'all' = 全部; 否则为精确 agentId。
  // 经 useDashboardInsights / useUsageSummary 下沉 runtime (matchesAgentView), 让首页可只看某个 agent。
  agentView: AgentView
  setAgentView: (agentView: AgentView) => void

  // GH-115 T4: 资产快照唯一写落点是 setAssetSnapshot / applyAssetProgress (foldKeepingShallow
  // 不变量); 裸替换 action (setAssets/setStats) 已删除, 使不变量在类型层不可绕过。
  assets: Asset[]
  stats: AssetStats

  assetRuntimeStatus: AssetRuntimeStatus
  assetSnapshotId: string | null
  assetErrors: ScanError[]
  setAssetRuntimeStatus: (status: AssetRuntimeStatus) => void
  setAssetSnapshot: (snapshot: AssetSnapshot) => void
  applyAssetProgress: (payload: { status: AssetRuntimeStatus; partial?: AssetScanPartial }) => void

  // GH-156: last update:state broadcast. Store-held (not hook-local) so late
  // mounters (Settings dialog, remounted sidebar) see the current phase instead
  // of a stale idle default.
  updateState: UpdateState
  setUpdateState: (updateState: UpdateState) => void

  inspectorOpen: boolean
  inspectorPath: string | null
  inspectorContent: string | null
  openInspector: (path: string, content: string) => void
  closeInspector: () => void
}

function hasCommittedAssetSnapshot(snapshotId: string | null): boolean {
  return snapshotId != null && snapshotId !== 'initial'
}

function shouldPreserveVisibleAssetsDuringScan(status: AssetRuntimeStatus, state: Pick<AppState, 'assetSnapshotId'>): boolean {
  return status.state === 'scanning' && hasCommittedAssetSnapshot(state.assetSnapshotId)
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: clampSidebarWidth(sidebarWidth) }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),


  scopeSelection: DEFAULT_SCOPE_SELECTION,
  projectCandidates: [],
  setScopeSelection: (scopeSelection) => set({ scopeSelection: normalizeScopeSelection(scopeSelection) }),
  setProjectCandidates: (projectCandidates) => set({ projectCandidates: mergeProjectScopeCandidates(projectCandidates) }),

  agentView: 'all',
  setAgentView: (agentView) => set({ agentView }),

  assets: [],
  stats: EMPTY_ASSET_STATS,

  assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
  assetSnapshotId: null,
  assetErrors: [],
  setAssetRuntimeStatus: (assetRuntimeStatus) => set({ assetRuntimeStatus }),
  setAssetSnapshot: (snapshot) =>
    set((state) => {
      if (shouldPreserveVisibleAssetsDuringScan(snapshot.status, state)) {
        return { assetRuntimeStatus: snapshot.status }
      }
      return {
        // Engine folds shallow engine-side (GH-135 方案 X); GUI projects as-is.
        assets: snapshot.assets,
        stats: snapshot.stats,
        projectCandidates: mergeProjectScopeCandidates(snapshot.projectCandidates),
        assetRuntimeStatus: snapshot.status,
        assetSnapshotId: snapshot.id,
        assetErrors: snapshot.errors
      }
    }),
  // Live scan tick (P4.6/GH-129): always update status. Partial assets populate
  // the initial view, but a background scan with an existing snapshot keeps the
  // visible list stale until the final snapshot arrives.
  // Deliberately does NOT touch assetSnapshotId — that only changes on completion,
  // so id-keyed consumers (plugin list) don't re-fetch on every partial.
  applyAssetProgress: (payload) =>
    set((state) => {
      const base = { assetRuntimeStatus: payload.status }
      if (!payload.partial) return base
      if (shouldPreserveVisibleAssetsDuringScan(payload.status, state)) return base
      // Engine folds shallow into the partial (GH-135 single source of truth); the
      // GUI is a pure projection — no business logic, just assign.
      return { ...base, assets: payload.partial.assets, stats: payload.partial.stats }
    }),

  updateState: { phase: 'idle' },
  setUpdateState: (updateState) => set({ updateState }),

  inspectorOpen: false,
  inspectorPath: null,
  inspectorContent: null,
  openInspector: (path, content) => set({ inspectorOpen: true, inspectorPath: path, inspectorContent: content }),
  closeInspector: () => set({ inspectorOpen: false, inspectorPath: null, inspectorContent: null })
}))
