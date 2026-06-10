import { create } from 'zustand'
import {
  DEFAULT_SCOPE_SELECTION,
  mergeProjectScopeCandidates,
  normalizeScopeSelection,
  type AppScopeSelection,
  type ProjectScopeCandidate
} from '@shared/scope'
import type { Asset, AssetStats } from '@shared/types/asset'
import type { AssetRuntimeStatus, AssetScanPartial, AssetSnapshot, ScanError } from '@shared/types/ipc'

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

  inspectorOpen: boolean
  inspectorPath: string | null
  inspectorContent: string | null
  openInspector: (path: string, content: string) => void
  closeInspector: () => void
}

// During a scan, snapshots/partials carry only the deep (active-project) set; other
// projects' shallow conventions/capabilities are appended to the FINAL snapshot
// (scanner.ts appendShallowConventions). A read landing mid-scan — a deep-only partial
// (progress channel) OR a deep-only snapshot via syncSnapshot (assets:changed → onChanged)
// — would drop them and flicker the global scope. Keep existing shallow until an incoming
// set actually carries shallow and replaces it wholesale. Both write paths use this so
// they can't diverge. (GH-113)
function foldKeepingShallow(incoming: Asset[], existing: Asset[]): Asset[] {
  if (incoming.some((a) => a.meta?.scanDepth === 'shallow')) return incoming
  const shallowKept = existing.filter((a) => a.meta?.scanDepth === 'shallow')
  return shallowKept.length > 0 ? [...incoming, ...shallowKept] : incoming
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

  assets: [],
  stats: EMPTY_ASSET_STATS,

  assetRuntimeStatus: IDLE_ASSET_RUNTIME_STATUS,
  assetSnapshotId: null,
  assetErrors: [],
  setAssetRuntimeStatus: (assetRuntimeStatus) => set({ assetRuntimeStatus }),
  setAssetSnapshot: (snapshot) => set((state) => ({
    // Keep shallow (other-project) assets if this snapshot was read mid-scan and
    // carries only the deep set — e.g. syncSnapshot via assets:changed → onChanged
    // landing during a refresh. Same guard as applyAssetProgress, shared. (GH-113)
    assets: foldKeepingShallow(snapshot.assets, state.assets),
    stats: snapshot.stats,
    projectCandidates: mergeProjectScopeCandidates(snapshot.projectCandidates),
    assetRuntimeStatus: snapshot.status,
    assetSnapshotId: snapshot.id,
    assetErrors: snapshot.errors
  })),
  // Live scan tick (P4.6): update status and, when a partial is present, fold the
  // cumulative assets/stats into the store so pages render already-scanned items.
  // Deliberately does NOT touch assetSnapshotId — that only changes on completion,
  // so id-keyed consumers (plugin list) don't re-fetch on every partial.
  applyAssetProgress: (payload) =>
    set((state) => {
      const base = { assetRuntimeStatus: payload.status }
      if (!payload.partial) return base
      const assets = foldKeepingShallow(payload.partial.assets, state.assets)
      return { ...base, assets, stats: payload.partial.stats }
    }),

  inspectorOpen: false,
  inspectorPath: null,
  inspectorContent: null,
  openInspector: (path, content) => set({ inspectorOpen: true, inspectorPath: path, inspectorContent: content }),
  closeInspector: () => set({ inspectorOpen: false, inspectorPath: null, inspectorContent: null })
}))
