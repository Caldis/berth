import { create } from 'zustand'
import type { Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  assets: Asset[]
  setAssets: (assets: Asset[]) => void

  stats: AssetStats
  setStats: (stats: AssetStats) => void

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
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  assets: [],
  setAssets: (assets) => set({ assets }),

  stats: {
    skills: 0,
    mcpServers: 0,
    sessions: 0,
    plugins: 0,
    hooks: 0,
    commands: 0,
    subagents: 0,
    teams: 0
  },
  setStats: (stats) => set({ stats }),

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
