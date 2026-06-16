import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { MOTION } from './motion'

export interface CollapsibleProps {
  /** Controlled open state; the caller owns it, so per-call behaviors (focus-to-expand, lazy body fetch) stay put. */
  open: boolean
  children: React.ReactNode
  /** Id for the content region, wired to the trigger's `aria-controls`. */
  id?: string
  /** Class applied to the inner content wrapper (caller's existing border-t / padding / spacing). */
  className?: string
  /**
   * Unmount children after collapse instead of keeping them mounted behind the
   * `grid-rows-[0fr]` clip. Default false. NoteCard sets this true to preserve
   * its "mount on expand + lazy-load body" semantics.
   */
  unmountOnExit?: boolean
  /** With `unmountOnExit`, delay before unmounting so the collapse animation can finish. Defaults to MOTION.durationMs.base. */
  unmountDelayMs?: number
  /** Forwarded to the outer (always-mounted) grid wrapper as `data-testid`. */
  testId?: string
}

/**
 * berth's canonical inline collapsible (GH-136). One animated disclosure
 * primitive distilled from memory-view's NoteCard: a CSS grid `0fr→1fr` height
 * transition (no framer-motion), `motion-reduce` aware, with `aria-hidden` +
 * `inert` so collapsed content is hidden from assistive tech and not focusable.
 * Replaces the app's hand-rolled `{open && <div>}` conditional renders
 * (instructions / capabilities cards) that mounted/unmounted with no transition.
 * Duration/easing track the motion tokens — `duration-200 ease-out` ≡
 * `MOTION.duration.base` + `MOTION.ease.standard`.
 */
export function Collapsible({
  open,
  children,
  id,
  className,
  unmountOnExit = false,
  unmountDelayMs = MOTION.durationMs.base,
  testId
}: CollapsibleProps): React.ReactElement {
  const [mounted, setMounted] = useState(open)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setMounted(true)
      return
    }
    // Already unmounted (initial collapsed render or post-collapse) — no timer needed.
    if (!unmountOnExit || !mounted) return
    timerRef.current = window.setTimeout(() => {
      setMounted(false)
      timerRef.current = null
    }, unmountDelayMs)
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [open, unmountOnExit, unmountDelayMs, mounted])

  const shouldRender = unmountOnExit ? mounted : true

  return (
    <div
      id={id}
      data-testid={testId}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {shouldRender && <div className={className}>{children}</div>}
      </div>
    </div>
  )
}

/**
 * Disclosure indicator for a Collapsible trigger, matching the teams page's
 * HeroUI Accordion indicator: a left-pointing chevron (‹) when collapsed that
 * rotates -90° to point down (▾) on open. Lives at the trailing (right) edge of
 * the trigger row. Replaces the hand-rolled `{open ? <ChevronDown/> :
 * <ChevronRight/>}` icon swaps so the indicator animates with the panel.
 */
export function CollapsibleChevron({
  open,
  className
}: {
  open: boolean
  className?: string
}): React.ReactElement {
  return (
    <ChevronLeft
      aria-hidden="true"
      className={cn(
        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
        open && '-rotate-90',
        className
      )}
    />
  )
}
