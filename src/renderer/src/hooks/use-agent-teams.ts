import { useCallback, useEffect, useState } from 'react'
import type { AgentTeamSummary } from '@shared/types/ipc'

// Module-level cache: team records are tiny (single-digit dirs) and change only
// when a team runs, so we show the last result instantly and refresh on mount.
let agentTeamsCache: AgentTeamSummary[] | null = null
let agentTeamsInFlight: Promise<AgentTeamSummary[]> | null = null

function requestAgentTeams(): Promise<AgentTeamSummary[]> {
  if (agentTeamsInFlight) return agentTeamsInFlight
  agentTeamsInFlight = window.api.teams
    .list()
    .then((result) => {
      const teams = result?.teams ?? []
      agentTeamsCache = teams
      return teams
    })
    .finally(() => {
      agentTeamsInFlight = null
    })
  return agentTeamsInFlight
}

export function resetAgentTeamsCacheForTests(): void {
  agentTeamsCache = null
  agentTeamsInFlight = null
}

export function useAgentTeams(): {
  teams: AgentTeamSummary[]
  loading: boolean
  stale: boolean
  error: string | null
  reload: () => void
} {
  const initialCache = agentTeamsCache
  const [teams, setTeams] = useState<AgentTeamSummary[]>(initialCache ?? [])
  const [loading, setLoading] = useState(initialCache == null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const reload = useCallback(() => {
    agentTeamsCache = null
    agentTeamsInFlight = null
    setReloadNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!window.api?.teams?.list) {
      setLoading(false)
      return
    }

    let cancelled = false
    const cached = agentTeamsCache
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
