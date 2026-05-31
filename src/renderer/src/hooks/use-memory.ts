import { useEffect, useState, useCallback, useRef } from 'react'
import type { MemoryListResult, MemoryNote } from '@shared/types/memory'

const empty: MemoryListResult = { notes: [], sources: [] }

export function useMemory(): {
  result: MemoryListResult
  /** True only during the first load (no data yet) — drives the full-view spinner. */
  loading: boolean
  /** True during a manual refresh while existing data stays on screen. */
  refreshing: boolean
  refresh: () => void
} {
  const [result, setResult] = useState<MemoryListResult>(empty)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const loadedRef = useRef(false)

  const refresh = useCallback(() => {
    if (!window.api?.memory?.list) {
      setLoading(false)
      return
    }
    // First load shows the full-view spinner; later refreshes keep the list
    // visible and only spin the button (no remount, no lost scroll/expand).
    if (loadedRef.current) setRefreshing(true)
    else setLoading(true)
    window.api.memory
      .list()
      .then((r) => setResult(r ?? empty))
      .catch(() => {})
      .finally(() => {
        loadedRef.current = true
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { result, loading, refreshing, refresh }
}

export function useMemoryNote(id: string | null): {
  note: MemoryNote | null
  loading: boolean
} {
  const [note, setNote] = useState<MemoryNote | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id || !window.api?.memory?.get) {
      setNote(null)
      return
    }
    setLoading(true)
    window.api.memory
      .get(id)
      .then((r) => setNote(r ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { note, loading }
}
