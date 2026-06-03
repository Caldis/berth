import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { AgentView, Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'
import type { AgentScanSourceGroup, SessionDetailResult, HealthCheck } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginManifestEntry
} from '@shared/types/agent-plugin'
import { useAppStore } from '@/stores/app'

const HEALTH_CHECK_CACHE_TTL_MS = 60_000

interface HealthCheckCache {
  checks: HealthCheck[]
  lastCheckedAt: string
  checkedAtMs: number
}

let healthCheckCache: HealthCheckCache | null = null
let healthCheckInFlight: Promise<HealthCheckCache> | null = null

interface SessionListRequest {
  projectFilter?: string
  projectPath?: string
  limit?: number
  agentView?: AgentView
}

interface SessionListCacheEntry {
  sessions: SessionSummary[]
  totalCount: number
  updatedAtMs: number
}

const sessionListCache = new Map<string, SessionListCacheEntry>()
const sessionListInFlight = new Map<string, Promise<SessionListCacheEntry>>()

function isHealthCheckCacheFresh(cache: HealthCheckCache | null): cache is HealthCheckCache {
  return cache != null && Date.now() - cache.checkedAtMs < HEALTH_CHECK_CACHE_TTL_MS
}

function requestHealthChecks(refresh: boolean): Promise<HealthCheckCache> {
  if (healthCheckInFlight) return healthCheckInFlight

  healthCheckInFlight = window.api.assets
    .healthCheck({ refresh })
    .then((result) => {
      const snapshot = {
        checks: result ?? [],
        lastCheckedAt: new Date().toISOString(),
        checkedAtMs: Date.now()
      }
      healthCheckCache = snapshot
      return snapshot
    })
    .finally(() => {
      healthCheckInFlight = null
    })

  return healthCheckInFlight
}

export function resetHealthCheckCacheForTests(): void {
  healthCheckCache = null
  healthCheckInFlight = null
}

export function resetSessionsCacheForTests(): void {
  sessionListCache.clear()
  sessionListInFlight.clear()
}

function createSessionListRequest(opts?: SessionListRequest): SessionListRequest {
  return {
    projectFilter: opts?.projectFilter,
    limit: opts?.limit,
    agentView: opts?.agentView,
    ...(opts?.projectPath ? { projectPath: opts.projectPath } : {})
  }
}

function sessionListCacheKey(request: SessionListRequest): string {
  return JSON.stringify({
    projectFilter: request.projectFilter ?? null,
    projectPath: request.projectPath ?? null,
    limit: request.limit ?? null,
    agentView: request.agentView ?? null
  })
}

function requestSessionsList(key: string, request: SessionListRequest): Promise<SessionListCacheEntry> {
  const pending = sessionListInFlight.get(key)
  if (pending) return pending

  const next = window.api.sessions
    .list(request)
    .then((result) => {
      const entry = {
        sessions: result?.sessions ?? [],
        totalCount: result?.totalCount ?? 0,
        updatedAtMs: Date.now()
      }
      sessionListCache.set(key, entry)
      return entry
    })
    .finally(() => {
      sessionListInFlight.delete(key)
    })
  sessionListInFlight.set(key, next)
  return next
}

export function useAssetRuntime(): {
  loading: boolean
  refresh: () => void
} {
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const setAssetRuntimeStatus = useAppStore((s) => s.setAssetRuntimeStatus)
  const setAssetSnapshot = useAppStore((s) => s.setAssetSnapshot)
  const mountedRef = useRef(false)

  const syncSnapshot = useCallback(async () => {
    if (!window.api?.assets?.snapshot) return
    const snapshot = await window.api.assets.snapshot()
    if (!mountedRef.current) return
    setAssetSnapshot(snapshot)
  }, [setAssetSnapshot])

  const refresh = useCallback(() => {
    if (!window.api?.assets?.refresh) return
    void window.api.assets
      .refresh({ wait: false })
      .then((nextStatus) => {
        if (!mountedRef.current) return
        setAssetRuntimeStatus(nextStatus)
        return window.api.assets.refresh({ wait: true })
      })
      .then((nextStatus) => {
        if (!mountedRef.current || !nextStatus) return
        setAssetRuntimeStatus(nextStatus)
        return syncSnapshot()
      })
      .catch(() => {})
  }, [setAssetRuntimeStatus, syncSnapshot])

  useEffect(() => {
    mountedRef.current = true
    void Promise.resolve()
      .then(async () => {
        if (window.api?.assets?.status) {
          setAssetRuntimeStatus(await window.api.assets.status())
        }
        await syncSnapshot()
      })
      .then(() => {
        const current = useAppStore.getState().assetRuntimeStatus
        if (current.state === 'idle' || current.state === 'stale' || current.state === 'error') {
          refresh()
        }
      })
      .catch(() => {})
    const unsubscribe = window.api?.assets?.onChanged?.(() => {
      void syncSnapshot()
    })
    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
    }
  }, [refresh, setAssetRuntimeStatus, syncSnapshot])

  return {
    loading: status.state === 'scanning',
    refresh
  }
}

export function useAssets(): {
  assets: Asset[]
  stats: AssetStats
  loading: boolean
  refresh: () => void
} {
  const assets = useAppStore((s) => s.assets)
  const stats = useAppStore((s) => s.stats)
  const runtime = useAssetRuntime()

  return { assets, stats, loading: runtime.loading, refresh: runtime.refresh }
}

export function useSessions(opts?: {
  projectFilter?: string
  projectPath?: string
  limit?: number
  agentView?: AgentView
}): { sessions: SessionSummary[]; loading: boolean; stale: boolean } {
  const projectFilter = opts?.projectFilter
  const projectPath = opts?.projectPath
  const limit = opts?.limit
  const agentView = opts?.agentView
  const request = useMemo(
    () => createSessionListRequest({ projectFilter, projectPath, limit, agentView }),
    [projectFilter, projectPath, limit, agentView]
  )
  const cacheKey = useMemo(() => sessionListCacheKey(request), [request])
  const initialCache = sessionListCache.get(cacheKey)
  const [sessions, setSessions] = useState<SessionSummary[]>(initialCache?.sessions ?? [])
  const [loading, setLoading] = useState(initialCache == null)
  const [stale, setStale] = useState(false)

  useEffect(() => {
    if (!window.api?.sessions?.list) {
      setLoading(false)
      setStale(false)
      return
    }

    let cancelled = false
    const cached = sessionListCache.get(cacheKey)
    if (cached) {
      setSessions(cached.sessions)
      setLoading(true)
      setStale(true)
    } else {
      setSessions([])
      setLoading(true)
      setStale(false)
    }

    requestSessionsList(cacheKey, request)
      .then((result) => {
        if (cancelled) return
        setSessions(result.sessions)
        setStale(false)
      })
      .catch(() => {
        if (!cancelled) setStale(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, request])

  return { sessions, loading, stale }
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

export function useUsageSummary(days: number, agentView?: AgentView, projectPath?: string): {
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
    const request = {
      days,
      agentView,
      ...(projectPath ? { projectPath } : {})
    }
    window.api.usage
      .summary(request)
      .then((result) => {
        setUsage(result ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days, agentView, projectPath])

  return { usage, loading }
}

export function useHealthChecks(): {
  checks: HealthCheck[]
  loading: boolean
  stale: boolean
  lastCheckedAt: string | null
  refresh: (opts?: { force?: boolean }) => void
} {
  const cached = healthCheckCache
  const mountedRef = useRef(false)
  const [checks, setChecks] = useState<HealthCheck[]>(cached?.checks ?? [])
  const [loading, setLoading] = useState(cached == null)
  const [stale, setStale] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(cached?.lastCheckedAt ?? null)

  const refresh = useCallback((opts: { force?: boolean } = {}) => {
    if (!window.api?.assets?.healthCheck) {
      setLoading(false)
      setStale(false)
      return
    }
    const previous = healthCheckCache
    if (previous) {
      setChecks(previous.checks)
      setLastCheckedAt(previous.lastCheckedAt)
    }
    setLoading(true)
    setStale(previous != null)
    requestHealthChecks(opts.force === true)
      .then((snapshot) => {
        if (!mountedRef.current) return
        setChecks(snapshot.checks)
        setLastCheckedAt(snapshot.lastCheckedAt)
        setStale(false)
      })
      .catch(() => {})
      .finally(() => {
        if (!mountedRef.current) return
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const currentCache = healthCheckCache
    if (isHealthCheckCacheFresh(currentCache)) {
      setChecks(currentCache.checks)
      setLastCheckedAt(currentCache.lastCheckedAt)
      setLoading(false)
      setStale(false)
    } else {
      refresh({ force: false })
    }
    const unsubscribe = window.api?.assets?.onChanged?.(() => {
      refresh({ force: true })
    })
    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
    }
  }, [refresh])

  return { checks, loading, stale, lastCheckedAt, refresh }
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
  manifests: AgentCapabilityPluginManifestEntry[]
  loading: boolean
  error: string | null
} {
  const [plugins, setPlugins] = useState<AgentCapabilityPlugin[]>([])
  const [manifests, setManifests] = useState<AgentCapabilityPluginManifestEntry[]>([])
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
        setManifests(result?.manifests ?? [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setPlugins([])
        setManifests([])
      })
      .finally(() => setLoading(false))
  }, [])

  return { plugins, manifests, loading, error }
}
