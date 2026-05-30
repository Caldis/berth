import { useEffect, useState, useCallback } from 'react'
import type { MemoryListResult, MemoryNote } from '@shared/types/memory'

const empty: MemoryListResult = { notes: [], sources: [] }

export function useMemory(): {
  result: MemoryListResult
  loading: boolean
  refresh: () => void
} {
  const [result, setResult] = useState<MemoryListResult>(empty)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!window.api?.memory?.list) {
      setLoading(false)
      return
    }
    setLoading(true)
    window.api.memory
      .list()
      .then((r) => setResult(r ?? empty))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { result, loading, refresh }
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
