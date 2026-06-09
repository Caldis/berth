import { useEffect, useState, useCallback, useRef } from 'react'
import type { MemoryListResult } from '@shared/types/memory'
import { memoryListSignature } from '@/lib/result-signature'
import { CachedResource } from './cached-resource'

const empty: MemoryListResult = { notes: [], sources: [] }
export const MEMORY_LIST_CACHE_TTL_MS = 30_000

const memoryResource = new CachedResource<MemoryListResult>(MEMORY_LIST_CACHE_TTL_MS, memoryListSignature)

function requestMemoryList(): Promise<MemoryListResult> {
  return memoryResource.request('', () => window.api.memory.list().then((result) => result ?? empty))
}

export function resetMemoryCacheForTests(): void {
  memoryResource.clear()
}

export function useMemory(): {
  result: MemoryListResult
  /** True only during the first load (no data yet) — drives the full-view spinner. */
  loading: boolean
  /** True during a manual refresh while existing data stays on screen. */
  refreshing: boolean
  refresh: () => void
} {
  const initialResult = memoryResource.peek()
  const [result, setResult] = useState<MemoryListResult>(initialResult ?? empty)
  const [loading, setLoading] = useState(initialResult === undefined)
  const [refreshing, setRefreshing] = useState(false)
  const loadedRef = useRef(initialResult !== undefined)
  const mountedRef = useRef(false)

  const load = useCallback((force: boolean) => {
    if (!window.api?.memory?.list) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const cached = memoryResource.peek()
    if (cached !== undefined) {
      setResult((current) => (current === cached ? current : cached))
      loadedRef.current = true
      if (!force && memoryResource.isFresh()) {
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
      .then((value) => {
        if (!mountedRef.current) return
        setResult((current) => (current === value ? current : value))
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

