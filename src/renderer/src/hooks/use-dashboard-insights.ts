import { useCallback, useEffect, useState } from 'react'
import type { DashboardInsights } from '@shared/types/insights'

// GH-138: 首页仪表盘聚合数据 hook。SWR 取向 — 出错保留上一份数据 (不清屏), assets 变更软刷新。
// 单次往返取回 insights:dashboard 全部聚合 (热力图/streak/峰值/排行/洞察), 各 widget 共享此结果。
export function useDashboardInsights(
  days = 365,
  projectPath?: string
): {
  insights: DashboardInsights | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [insights, setInsights] = useState<DashboardInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  useEffect(() => {
    if (!window.api?.insights?.dashboard) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const request = { days, ...(projectPath ? { projectPath } : {}) }
    window.api.insights
      .dashboard(request)
      .then((result) => {
        if (cancelled) return
        setInsights(result ?? null)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days, projectPath, reloadNonce])

  useEffect(() => {
    const unsubscribe = window.api?.assets?.onChanged?.(() => reload())
    return unsubscribe
  }, [reload])

  return { insights, loading, error, reload }
}
