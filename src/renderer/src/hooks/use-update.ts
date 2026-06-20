import { useCallback, useEffect, useState } from 'react'
import type { UpdatePreferences, UpdateState } from '@shared/types/ipc'

const DEFAULT_PREFERENCES: UpdatePreferences = {
  autoCheck: true,
  autoDownload: false,
  allowPrerelease: false
}

/**
 * GH-124/GH-134: subscribes to the aggregated `update:state` push and exposes
 * the update actions + the autoCheck / autoDownload / allowPrerelease (beta)
 * preferences. `setPreference` merges a partial patch so toggling one switch
 * never clobbers the others.
 */
export function useUpdate(): {
  state: UpdateState
  preferences: UpdatePreferences
  check: () => void
  download: () => void
  install: () => void
  setPreference: (patch: Partial<UpdatePreferences>) => void
} {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [preferences, setPreferences] = useState<UpdatePreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    // GH-14: guard the mount-time getPreferences chain so a fast mount/unmount
    // doesn't setState after unmount (or settle its callback post-teardown).
    // onState already cleans up via its unsubscribe; behavior-identical while mounted.
    let cancelled = false
    window.api?.update
      .getPreferences()
      .then((next) => {
        if (cancelled) return
        setPreferences(next)
      })
      .catch(() => {})
    const unsubscribe = window.api?.update.onState(setState)
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const check = useCallback(() => { void window.api?.update.check() }, [])
  const download = useCallback(() => { void window.api?.update.download() }, [])
  const install = useCallback(() => { void window.api?.update.install() }, [])
  const setPreference = useCallback((patch: Partial<UpdatePreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch }
      void window.api?.update.setPreferences(next)
      return next
    })
  }, [])

  return { state, preferences, check, download, install, setPreference }
}
