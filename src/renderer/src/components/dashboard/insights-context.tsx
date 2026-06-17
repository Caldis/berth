import { createContext, useContext, type ReactNode } from 'react'
import { useDashboardInsights } from '@/hooks/use-dashboard-insights'
import { useAppStore } from '@/stores/app'

// GH-138: insights 共享上下文 — 仪表盘只取一次 insights:dashboard, 供 stats-band/heatmap/
// insights/top-usage 多个 widget 消费, 避免每 widget 各发一次 IPC (性能不变量)。
type InsightsValue = ReturnType<typeof useDashboardInsights>

const InsightsContext = createContext<InsightsValue | null>(null)

export function DashboardInsightsProvider({
  projectPath,
  children
}: {
  projectPath?: string
  children: ReactNode
}): React.ReactElement {
  const agentView = useAppStore((s) => s.agentView)
  const value = useDashboardInsights(365, projectPath, agentView)
  return <InsightsContext.Provider value={value}>{children}</InsightsContext.Provider>
}

export function useInsights(): InsightsValue {
  const ctx = useContext(InsightsContext)
  if (!ctx) {
    throw new Error('useInsights must be used within <DashboardInsightsProvider>')
  }
  return ctx
}
