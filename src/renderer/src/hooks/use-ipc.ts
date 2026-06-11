import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { AgentView, Asset, AssetStats, SessionSummary, UsageSummary } from '@shared/types/asset'
import type { SessionDetailResult, SessionReplayResult, HealthCheck } from '@shared/types/ipc'
import type {
  AgentCapabilityPlugin,
  AgentCapabilityPluginListResult,
  AgentCapabilityPluginManifestEntry
} from '@shared/types/agent-plugin'
import { useAppStore } from '@/stores/app'
import { sessionListSignature } from '@/lib/result-signature'
import { CachedResource } from './cached-resource'

const HEALTH_CHECK_CACHE_TTL_MS = 60_000
export const SESSION_LIST_CACHE_TTL_MS = 30_000
export const SESSION_REPLAY_CACHE_TTL_MS = 60_000

interface HealthCheckValue {
  checks: HealthCheck[]
  lastCheckedAt: string
}

const healthResource = new CachedResource<HealthCheckValue>(HEALTH_CHECK_CACHE_TTL_MS)
// Agent plugins are snapshot-triggered (no TTL freshness gate): ttl 0 means
// peek() still serves the last value for instant display, but the hook always
// refetches when assetSnapshotId changes.
const agentPluginResource = new CachedResource<AgentCapabilityPluginListResult>(0)

interface SessionListRequest {
  projectFilter?: string
  projectPath?: string
  limit?: number
  agentView?: AgentView
}

interface SessionListValue {
  sessions: SessionSummary[]
  totalCount: number
}

const sessionsResource = new CachedResource<SessionListValue>(
  SESSION_LIST_CACHE_TTL_MS,
  (value) => sessionListSignature(value.sessions, value.totalCount)
)

// GH-116: 重放事件按 session id 缓存 — tab 来回切换不重复走 IPC/解析。
const sessionReplayResource = new CachedResource<SessionReplayResult | null>(
  SESSION_REPLAY_CACHE_TTL_MS
)

function requestHealthChecks(refresh: boolean): Promise<HealthCheckValue> {
  return healthResource.request('', () =>
    window.api.assets.healthCheck({ refresh }).then((result) => ({
      checks: result ?? [],
      lastCheckedAt: new Date().toISOString()
    }))
  )
}

export function resetHealthCheckCacheForTests(): void {
  healthResource.clear()
}

export function resetSessionsCacheForTests(): void {
  sessionsResource.clear()
  sessionReplayResource.clear()
}

export function resetAgentCapabilityPluginCacheForTests(): void {
  agentPluginResource.clear()
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

function requestSessionsList(key: string, request: SessionListRequest): Promise<SessionListValue> {
  return sessionsResource.request(key, () =>
    window.api.sessions
      .list(request)
      .then((result) => ({ sessions: result?.sessions ?? [], totalCount: result?.totalCount ?? 0 }))
  )
}

function requestAgentCapabilityPlugins(): Promise<AgentCapabilityPluginListResult> {
  return agentPluginResource.request('', () =>
    window.api.agentPlugins.list().then((result) => ({
      plugins: result?.plugins ?? [],
      manifests: result?.manifests ?? []
    }))
  )
}

export function useAssetRuntime(): {
  loading: boolean
  refresh: () => void
  error: string | null
  retry: () => void
} {
  const status = useAppStore((s) => s.assetRuntimeStatus)
  const setAssetRuntimeStatus = useAppStore((s) => s.setAssetRuntimeStatus)
  const setAssetSnapshot = useAppStore((s) => s.setAssetSnapshot)
  const applyAssetProgress = useAppStore((s) => s.applyAssetProgress)
  const mountedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapNonce, setBootstrapNonce] = useState(0)

  // GH-118: re-runs the initial status/snapshot bootstrap from scratch after a failure.
  const retry = useCallback(() => {
    setError(null)
    setBootstrapNonce((n) => n + 1)
  }, [])

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
      .then(() => {
        if (!mountedRef.current) return
        setError(null)
      })
      .catch((err) => {
        // GH-118: a failed rescan is observable (existing snapshot data stays in the store).
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : String(err))
      })
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
        if (!mountedRef.current) return
        setError(null)
        const current = useAppStore.getState().assetRuntimeStatus
        if (current.state === 'idle' || current.state === 'stale' || current.state === 'error') {
          refresh()
        }
      })
      .catch((err) => {
        // GH-118: a failed bootstrap leaves the whole app empty — surface it (AC-2 ①).
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : String(err))
      })
    const unsubscribe = window.api?.assets?.onChanged?.(() => {
      void syncSnapshot()
    })
    // Live scan progress: status + already-scanned assets stream in mid-scan (P4.6).
    const unsubscribeProgress = window.api?.assets?.onProgress?.((payload) => {
      if (!mountedRef.current) return
      applyAssetProgress(payload)
    })
    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
      if (unsubscribeProgress) unsubscribeProgress()
    }
  }, [applyAssetProgress, refresh, setAssetRuntimeStatus, syncSnapshot, bootstrapNonce])

  return {
    loading: status.state === 'scanning',
    refresh,
    error,
    retry
  }
}

export function useAssets(): {
  assets: Asset[]
  stats: AssetStats
  loading: boolean
  refresh: () => void
  error: string | null
  retry: () => void
} {
  const assets = useAppStore((s) => s.assets)
  const stats = useAppStore((s) => s.stats)
  const runtime = useAssetRuntime()

  return {
    assets,
    stats,
    loading: runtime.loading,
    refresh: runtime.refresh,
    error: runtime.error,
    retry: runtime.retry
  }
}

export function useSessions(opts?: {
  projectFilter?: string
  projectPath?: string
  limit?: number
  agentView?: AgentView
}): { sessions: SessionSummary[]; loading: boolean; stale: boolean; error: string | null; reload: () => void } {
  const projectFilter = opts?.projectFilter
  const projectPath = opts?.projectPath
  const limit = opts?.limit
  const agentView = opts?.agentView
  const request = useMemo(
    () => createSessionListRequest({ projectFilter, projectPath, limit, agentView }),
    [projectFilter, projectPath, limit, agentView]
  )
  const cacheKey = useMemo(() => sessionListCacheKey(request), [request])
  const initialCache = sessionsResource.peek(cacheKey)
  const [sessions, setSessions] = useState<SessionSummary[]>(initialCache?.sessions ?? [])
  const [loading, setLoading] = useState(initialCache === undefined)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  // Retry: drop the cached entry + in-flight promise for this key so the effect
  // re-requests from scratch (a fresh cache would otherwise short-circuit it).
  const reload = useCallback(() => {
    sessionsResource.invalidate(cacheKey)
    setReloadNonce((n) => n + 1)
  }, [cacheKey])

  useEffect(() => {
    if (!window.api?.sessions?.list) {
      setLoading(false)
      setStale(false)
      return
    }

    let cancelled = false
    const cached = sessionsResource.peek(cacheKey)
    if (cached) {
      setSessions((current) => (current === cached.sessions ? current : cached.sessions))
      if (sessionsResource.isFresh(cacheKey)) {
        setLoading(false)
        setStale(false)
        setError(null)
        return
      }
      setLoading(true)
      setStale(true)
    } else {
      setSessions([])
      setLoading(true)
      setStale(false)
    }
    setError(null)

    requestSessionsList(cacheKey, request)
      .then((result) => {
        if (cancelled) return
        setSessions((current) => (current === result.sessions ? current : result.sessions))
        setStale(false)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setStale(false)
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, request, reloadNonce])

  return { sessions, loading, stale, error, reload }
}

export function useSessionDetail(id: string): {
  detail: SessionDetailResult | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [detail, setDetail] = useState<SessionDetailResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  useEffect(() => {
    if (!id || !window.api?.sessions?.get) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    window.api.sessions
      .get(id)
      .then((result) => {
        if (cancelled) return
        setDetail(result ?? null)
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
  }, [id, reloadNonce])

  return { detail, loading, error, reload }
}

export function useSessionReplay(id: string): {
  replay: SessionReplayResult | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const initialCache = id ? sessionReplayResource.peek(id) : undefined
  const [replay, setReplay] = useState<SessionReplayResult | null>(initialCache ?? null)
  const [loading, setLoading] = useState(initialCache === undefined)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => {
    sessionReplayResource.invalidate(id)
    setReloadNonce((n) => n + 1)
  }, [id])

  useEffect(() => {
    if (!id || !window.api?.sessions?.events) {
      setLoading(false)
      return
    }
    let cancelled = false
    const cached = sessionReplayResource.peek(id)
    if (cached !== undefined) {
      setReplay(cached)
      if (sessionReplayResource.isFresh(id)) {
        setLoading(false)
        setError(null)
        return
      }
    } else {
      setReplay(null)
    }
    setLoading(true)
    setError(null)

    sessionReplayResource
      .request(id, () => window.api.sessions.events(id).then((result) => result ?? null))
      .then((result) => {
        if (cancelled) return
        setReplay(result)
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
  }, [id, reloadNonce])

  return { replay, loading, error, reload }
}

export function useUsageSummary(days: number, agentView?: AgentView, projectPath?: string): {
  usage: UsageSummary | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  useEffect(() => {
    if (!window.api?.usage?.summary) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const request = {
      days,
      agentView,
      ...(projectPath ? { projectPath } : {})
    }
    window.api.usage
      .summary(request)
      .then((result) => {
        if (cancelled) return
        setUsage(result ?? null)
        setError(null)
      })
      .catch((err) => {
        // GH-118: surface the failure (previous summary is kept — SWR, no clear-screen).
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days, agentView, projectPath, reloadNonce])

  return { usage, loading, error, reload }
}

export function useHealthChecks(): {
  checks: HealthCheck[]
  loading: boolean
  stale: boolean
  lastCheckedAt: string | null
  error: string | null
  refresh: (opts?: { force?: boolean }) => void
} {
  const cached = healthResource.peek()
  const mountedRef = useRef(false)
  const [checks, setChecks] = useState<HealthCheck[]>(cached?.checks ?? [])
  const [loading, setLoading] = useState(cached === undefined)
  const [stale, setStale] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(cached?.lastCheckedAt ?? null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback((opts: { force?: boolean } = {}) => {
    if (!window.api?.assets?.healthCheck) {
      setLoading(false)
      setStale(false)
      return
    }
    const previous = healthResource.peek()
    if (previous) {
      setChecks(previous.checks)
      setLastCheckedAt(previous.lastCheckedAt)
    }
    setLoading(true)
    setStale(previous !== undefined)
    setError(null)
    requestHealthChecks(opts.force === true)
      .then((snapshot) => {
        if (!mountedRef.current) return
        setChecks(snapshot.checks)
        setLastCheckedAt(snapshot.lastCheckedAt)
        setStale(false)
        setError(null)
      })
      .catch((err) => {
        // GH-118: surface the failure and reset stale (previous checks are kept — SWR).
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : String(err))
        setStale(false)
      })
      .finally(() => {
        if (!mountedRef.current) return
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const currentCache = healthResource.peek()
    if (currentCache && healthResource.isFresh()) {
      setChecks(currentCache.checks)
      setLastCheckedAt(currentCache.lastCheckedAt)
      setLoading(false)
      setStale(false)
    } else {
      refresh({ force: false })
    }
    const unsubscribe = window.api?.assets?.onChanged?.(() => {
      // Soft refresh (GH-113 I1): re-evaluate health against the snapshot the
      // incremental indexer just updated — NOT force:true, which would trigger a
      // full rescan and defeat the per-file incremental write.
      refresh({ force: false })
    })
    return () => {
      mountedRef.current = false
      if (unsubscribe) unsubscribe()
    }
  }, [refresh])

  return { checks, loading, stale, lastCheckedAt, error, refresh }
}

export function useAgentCapabilityPlugins(): {
  plugins: AgentCapabilityPlugin[]
  manifests: AgentCapabilityPluginManifestEntry[]
  loading: boolean
  stale: boolean
  error: string | null
} {
  const assetSnapshotId = useAppStore((s) => s.assetSnapshotId)
  const initialCache = agentPluginResource.peek()
  const [plugins, setPlugins] = useState<AgentCapabilityPlugin[]>(initialCache?.plugins ?? [])
  const [manifests, setManifests] = useState<AgentCapabilityPluginManifestEntry[]>(
    initialCache?.manifests ?? []
  )
  const [loading, setLoading] = useState(true)
  const [stale, setStale] = useState(initialCache !== undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api?.agentPlugins?.list) {
      setLoading(false)
      setStale(false)
      setError('agentPlugins.list is unavailable')
      return
    }

    let cancelled = false
    const cached = agentPluginResource.peek()
    if (cached) {
      setPlugins(cached.plugins)
      setManifests(cached.manifests)
      setStale(true)
    } else {
      setPlugins([])
      setManifests([])
      setStale(false)
    }
    setLoading(true)
    setError(null)

    requestAgentCapabilityPlugins()
      .then((result) => {
        if (cancelled) return
        setPlugins(result.plugins)
        setManifests(result.manifests)
        setStale(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        const latestCache = agentPluginResource.peek()
        if (latestCache) {
          setPlugins(latestCache.plugins)
          setManifests(latestCache.manifests)
        } else {
          setPlugins([])
          setManifests([])
        }
        setStale(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [assetSnapshotId])

  return { plugins, manifests, loading, stale, error }
}
