import { useCallback, useEffect, useState } from 'react'
import type { AgentTeamSummary } from '@shared/types/ipc'
import { CachedResource } from './cached-resource'

// Team records are tiny (single-digit dirs) and change only when a team runs,
// so we show the last result instantly and refresh on mount (ttl 0 = never
// fresh, every mount revalidates; the cache only serves the instant paint).
const teamsResource = new CachedResource<AgentTeamSummary[]>(0)

function requestAgentTeams(): Promise<AgentTeamSummary[]> {
  return teamsResource.request('', () => window.api.teams.list().then((result) => result?.teams ?? []))
}

export function resetAgentTeamsCacheForTests(): void {
  teamsResource.clear()
}

export function useAgentTeams(): {
  teams: AgentTeamSummary[]
  loading: boolean
  stale: boolean
  error: string | null
  reload: () => void
} {
  const initialCache = teamsResource.peek()
  const [teams, setTeams] = useState<AgentTeamSummary[]>(initialCache ?? [])
  const [loading, setLoading] = useState(initialCache == null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => {
    teamsResource.invalidate()
    setReloadNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!window.api?.teams?.list) {
      setLoading(false)
      return
    }

    let cancelled = false
    const cached = teamsResource.peek()
    if (cached) {
      setTeams((current) => (current === cached ? current : cached))
      setLoading(true)
      setStale(true)
    } else {
      setTeams([])
      setLoading(true)
      setStale(false)
    }
    setError(null)

    requestAgentTeams()
      .then((result) => {
        if (cancelled) return
        setTeams((current) => (current === result ? current : result))
        setStale(false)
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
  }, [reloadNonce])

  return { teams, loading, stale, error, reload }
}
