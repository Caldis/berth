import { useEffect, useState, useCallback } from 'react'
import type { Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'
import type { SessionDetailResult, HealthCheck } from '@shared/types/ipc'

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
  const [assets, setAssets] = useState<Asset[]>([])
  const [stats, setStats] = useState<AssetStats>(emptyStats)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!window.api?.assets?.scanAll) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.assets
      .scanAll()
      .then((result) => {
        if (result) {
          setAssets(result.assets ?? [])
          setStats(result.stats ?? emptyStats)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { assets, stats, loading, refresh }
}

export function useSessions(opts?: {
  projectFilter?: string
  limit?: number
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
      .list({ projectFilter: opts?.projectFilter, limit: opts?.limit })
      .then((result) => {
        setSessions(result?.sessions ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [opts?.projectFilter, opts?.limit])

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

export function useUsageSummary(days: number): {
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
      .summary({ days })
      .then((result) => {
        setUsage(result ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days])

  return { usage, loading }
}

export function useHealthChecks(): {
  checks: HealthCheck[]
  loading: boolean
} {
  const [checks, setChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.api?.assets?.healthCheck) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.assets
      .healthCheck()
      .then((result) => {
        setChecks(result ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { checks, loading }
}
