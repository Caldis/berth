import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Highlight duration for a cross-page focus jump (mirrors memory-view). */
export const FOCUS_PULSE_MS = 2000

/** Shared "this row/card is the jump target" highlight (ring + transient pulse). */
export const FOCUS_HIGHLIGHT_CLASS = 'border-primary ring-1 ring-primary motion-safe:animate-pulse'

export interface FocusNavState {
  focusAssetId?: string
}

/**
 * Cross-page focus contract (GH-112). A navigator does
 * `navigate(routeForAsset(asset), { state: { focusAssetId } })`; the target page
 * calls this hook to learn which asset to locate + highlight. The history state
 * is consumed once (replaced away) so back/refresh/re-render don't re-fire it,
 * and the highlight auto-clears after FOCUS_PULSE_MS.
 */
export function useFocusTarget(): { focusId: string | null; isFocused: (id: string) => boolean } {
  const location = useLocation()
  const navigate = useNavigate()
  const [focusId, setFocusId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const stateFocus = (location.state as FocusNavState | null)?.focusAssetId ?? null

  useEffect(() => {
    if (!stateFocus) return
    // Consume the intent so it doesn't re-fire on back/refresh/re-render.
    navigate(location.pathname, { replace: true, state: {} })
    setFocusId(stateFocus)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setFocusId((current) => (current === stateFocus ? null : current))
      timerRef.current = null
    }, FOCUS_PULSE_MS)
  }, [stateFocus, location.pathname, navigate])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const isFocused = useCallback((id: string) => focusId === id, [focusId])
  return { focusId, isFocused }
}
