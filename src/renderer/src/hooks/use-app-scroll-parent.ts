import { useEffect, useState } from 'react'

export const APP_CONTENT_SCROLL_SELECTOR = '[data-testid="app-content-scroll"]'

export function useAppScrollParent(): HTMLElement | null {
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    setScrollParent(document.querySelector<HTMLElement>(APP_CONTENT_SCROLL_SELECTOR))
  }, [])

  return scrollParent
}
