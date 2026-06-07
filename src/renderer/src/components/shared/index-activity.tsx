import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useIndexActivity } from '@/hooks/use-index-activity'

/**
 * Ambient "indexing" presence (GH-113 observability). The indexer is one calm
 * background activity surfaced in three non-blocking places that share a single
 * motion language — an accent scanner sweep and a breathing pulse — so the app
 * always signals "working, unobtrusively" rather than blocking with a spinner.
 */

/** A slow breathing dot in the accent color. The atom of the indexing language. */
export function IndexPulse({ className }: { className?: string }): React.ReactElement {
  return (
    <span className={cn('relative flex h-2 w-2 shrink-0', className)} aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-[hsl(var(--primary))] opacity-30 motion-safe:animate-[index-breathe_1.8s_ease-in-out_infinite]" />
      <span className="relative m-auto h-1 w-1 rounded-full bg-[hsl(var(--primary))]" />
    </span>
  )
}

/**
 * The signature element: a 2px scanner line riding the boundary below the title
 * bar. A real percentage fill during the bulk parse, a quiet sweep otherwise, and
 * a soft fade to nothing when idle — peripheral, never demanding attention.
 */
export function IndexHairline(): React.ReactElement {
  const { active, determinate, pct } = useIndexActivity()

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] overflow-hidden transition-opacity duration-500 ease-out',
        active ? 'opacity-100' : 'opacity-0'
      )}
      aria-hidden="true"
    >
      {/* faint track tinted toward the brand hue, only perceptible while active */}
      <div className="absolute inset-0 bg-[color-mix(in_oklch,hsl(var(--primary))_16%,transparent)]" />
      {determinate ? (
        <div
          className="absolute inset-y-0 left-0 bg-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary)/0.55)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      ) : (
        active && (
          <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent shadow-[0_0_8px_hsl(var(--primary)/0.5)] motion-safe:animate-[index-sweep_1.15s_cubic-bezier(0.4,0,0.2,1)_infinite] motion-reduce:left-0 motion-reduce:w-full motion-reduce:via-[hsl(var(--primary))]/40 motion-reduce:animate-[index-breathe_1.8s_ease-in-out_infinite]" />
        )
      )}
    </div>
  )
}

/**
 * Compact inline presence for the shared page header and the sidebar — a pulse
 * plus a live "found" count. Renders nothing when idle, so every subpage gets the
 * same unobtrusive "still indexing" hint without per-page wiring.
 */
export function IndexingInline({ className }: { className?: string }): React.ReactElement | null {
  const { t } = useTranslation()
  const { active, scanned } = useIndexActivity()
  if (!active) return null

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      role="status"
      aria-live="polite"
      data-testid="indexing-inline"
    >
      <IndexPulse />
      <span className="tabular-nums">
        {t('nav.scanStatus.indexing')}
        {scanned > 0 ? ` · ${t('nav.scanStatus.found', { count: scanned })}` : ''}
      </span>
    </span>
  )
}
