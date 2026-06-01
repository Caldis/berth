import { useEffect, useState, useCallback } from 'react'
import type { AgentView, Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'
import type { AgentScanSourceGroup, SessionDetailResult, HealthCheck } from '@shared/types/ipc'
import type { AgentCapabilityPlugin } from '@shared/types/agent-plugin'
import { useAppStore } from '@/stores/app'

const emptyStats: AssetStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
}

export function useAssets(): {
  assets: Asset[]
  stats: AssetStats
  loading: boolean
  refresh: () => void
} {
  const assets = useAppStore((s) => s.assets)
  const stats = useAppStore((s) => s.stats)
  const loading = useAppStore((s) => s.scanning)
  const setAssets = useAppStore((s) => s.setAssets)
  const setStats = useAppStore((s) => s.setStats)
  const setScanning = useAppStore((s) => s.setScanning)

  const refresh = useCallback(() => {
    if (!window.api?.assets?.scanAll) {
      setScanning(false)
      return
    }
    setScanning(true)
    window.api.assets
      .scanAll()
      .then((result) => {
        if (result) {
          setAssets(result.assets ?? [])
          setStats(result.stats ?? emptyStats)
        }
      })
      .catch(() => {})
      .finally(() => setScanning(false))
  }, [setAssets, setScanning, setStats])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { assets, stats, loading, refresh }
}

export function useSessions(opts?: {
  projectFilter?: string
  limit?: number
  agentView?: AgentView
}): { sessions: SessionSummary[]; loading: boolean } {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.api?.sessions?.list) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.sessions
      .list({ projectFilter: opts?.projectFilter, limit: opts?.limit, agentView: opts?.agentView })
      .then((result) => {
        setSessions(result?.sessions ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [opts?.projectFilter, opts?.limit, opts?.agentView])

  return { sessions, loading }
}

export function useSessionDetail(id: string): {
  detail: SessionDetailResult | null
  loading: boolean
} {
  const [detail, setDetail] = useState<SessionDetailResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !window.api?.sessions?.get) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.sessions
      .get(id)
      .then((result) => {
        setDetail(result ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { detail, loading }
}

export function useUsageSummary(days: number, agentView?: AgentView): {
  usage: UsageSummary | null
  loading: boolean
} {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.api?.usage?.summary) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.usage
      .summary({ days, agentView })
      .then((result) => {
        setUsage(result ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days, agentView])

  return { usage, loading }
}

export function useHealthChecks(): {
  checks: HealthCheck[]
  loading: boolean
  lastCheckedAt: string | null
  refresh: () => void
} {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!window.api?.assets?.healthCheck) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.assets
      .healthCheck()
      .then((result) => {
        setChecks(result ?? [])
        setLastCheckedAt(new Date().toISOString())
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = window.api?.assets?.onChanged?.(() => {
      refresh()
    })
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [refresh])

  return { checks, loading, lastCheckedAt, refresh }
}

export function useScanSources(): {
  groups: AgentScanSourceGroup[]
  loading: boolean
} {
  const [groups, setGroups] = useState<AgentScanSourceGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.api?.assets?.scanSources) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.assets
      .scanSources()
      .then((result) => {
        setGroups(result ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { groups, loading }
}

export function useAgentCapabilityPlugins(): {
  plugins: AgentCapabilityPlugin[]
  loading: boolean
  error: string | null
} {
  const [plugins, setPlugins] = useState<AgentCapabilityPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api?.agentPlugins?.list) {
      setLoading(false)
      setError('agentPlugins.list is unavailable')
      return
    }
    setLoading(true)
    setError(null)
    window.api.agentPlugins
      .list()
      .then((result) => {
        setPlugins(result?.plugins ?? [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setPlugins([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { plugins, loading, error }
}
