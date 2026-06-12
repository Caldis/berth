import { useCallback, useEffect, useState } from 'react'
import type { UpdatePreferences, UpdateState } from '@shared/types/ipc'

/**
 * GH-124: subscribes to the aggregated `update:state` push and exposes the
 * update actions + the autoDownload preference. The unsigned-macOS degradation
 * arrives as `state.platformLimited` from the main process — the UI swaps
 * download/install for a "go to downloads" link in that case.
 */
export function useUpdate(): {
  state: UpdateState
  preferences: UpdatePreferences
  check: () => void
  download: () => void
  install: () => void
  setAutoDownload: (value: boolean) => void
} {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [preferences, setPreferences] = useState<UpdatePreferences>({ autoDownload: false })

  useEffect(() => {
    window.api?.update.getPreferences().then(setPreferences).catch(() => {})
    return window.api?.update.onState(setState)
  }, [])

  const check = useCallback(() => { void window.api?.update.check() }, [])
  const download = useCallback(() => { void window.api?.update.download() }, [])
  const install = useCallback(() => { void window.api?.update.install() }, [])
  const setAutoDownload = useCallback((value: boolean) => {
    const next = { autoDownload: value }
    setPreferences(next)
    void window.api?.update.setPreferences(next)
  }, [])

  return { state, preferences, check, download, install, setAutoDownload }
}
