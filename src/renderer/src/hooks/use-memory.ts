import { useEffect, useState, useCallback, useRef } from 'react'
import type { MemoryListResult, MemoryNote } from '@shared/types/memory'
import { memoryListSignature } from '@/lib/result-signature'

const empty: MemoryListResult = { notes: [], sources: [] }
export const MEMORY_LIST_CACHE_TTL_MS = 30_000

interface MemoryListCacheEntry {
  result: MemoryListResult
  signature: string
  updatedAtMs: number
}

let memoryListCache: MemoryListCacheEntry | null = null
let memoryListInFlight: Promise<MemoryListCacheEntry> | null = null

function isMemoryListCacheFresh(cache: MemoryListCacheEntry | null): cache is MemoryListCacheEntry {
  return cache != null && Date.now() - cache.updatedAtMs < MEMORY_LIST_CACHE_TTL_MS
}

function createMemoryListCacheEntry(result: MemoryListResult): MemoryListCacheEntry {
  const signature = memoryListSignature(result)
  const previous = memoryListCache
  const entry =
    previous?.signature === signature
      ? {
          ...previous,
          updatedAtMs: Date.now()
        }
      : {
          result,
          signature,
          updatedAtMs: Date.now()
        }
  memoryListCache = entry
  return entry
}

function requestMemoryList(): Promise<MemoryListCacheEntry> {
  if (memoryListInFlight) return memoryListInFlight

  memoryListInFlight = window.api.memory
    .list()
    .then((result) => createMemoryListCacheEntry(result ?? empty))
    .finally(() => {
      memoryListInFlight = null
    })

  return memoryListInFlight
}

export function resetMemoryCacheForTests(): void {
  memoryListCache = null
  memoryListInFlight = null
}

export function useMemory(): {
  result: MemoryListResult
  /** True only during the first load (no data yet) — drives the full-view spinner. */
  loading: boolean
  /** True during a manual refresh while existing data stays on screen. */
  refreshing: boolean
  refresh: () => void
} {
  const initialCache = memoryListCache
  const [result, setResult] = useState<MemoryListResult>(initialCache?.result ?? empty)
  const [loading, setLoading] = useState(initialCache == null)
  const [refreshing, setRefreshing] = useState(false)
  const loadedRef = useRef(initialCache != null)
  const mountedRef = useRef(false)

  const load = useCallback((force: boolean) => {
    if (!window.api?.memory?.list) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const cached = memoryListCache
    if (cached) {
      setResult((current) => (current === cached.result ? current : cached.result))
      loadedRef.current = true
      if (!force && isMemoryListCacheFresh(cached)) {
        setLoading(false)
        setRefreshing(false)
        return
      }
    }

    if (loadedRef.current) {
      setLoading(false)
      setRefreshing(true)
    } else {
      setLoading(true)
      setRefreshing(false)
    }

    requestMemoryList()
      .then((entry) => {
        if (!mountedRef.current) return
        setResult((current) => (current === entry.result ? current : entry.result))
      })
      .catch(() => {})
      .finally(() => {
        if (!mountedRef.current) return
        loadedRef.current = true
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  const refresh = useCallback(() => {
    load(true)
  }, [load])

  useEffect(() => {
    mountedRef.current = true
    load(false)
    return () => {
      mountedRef.current = false
    }
  }, [load])

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
