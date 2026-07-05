import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2 } from 'lucide-react'
import type { UpdateState } from '@shared/types/ipc'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/components/ui'
import { FloatingPopover } from '@/components/shared/floating-popover'
import { useUpdate } from '@/hooks/use-update'
import { formatVersionRange, releaseNoteHtmlToText, versionTag } from '@/lib/release-notes'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'

/**
 * GH-156: persistent update presence in the sidebar footer, modeled on the
 * bobcorn status-strip micro-interaction: no interruptive dialogs — a quiet
 * one-line indicator whose click advances the update (download → install →
 * retry), with the release notes living in a hover panel that zooms into a
 * modal. Renders nothing while idle/up-to-date; the manual check stays in
 * Settings → About.
 */

const DOT_CLASS = 'inline-block h-1.5 w-1.5 shrink-0 rounded-full'

function dotColor(phase: UpdateState['phase']): string {
  switch (phase) {
    case 'available':
    case 'downloading':
      return 'bg-primary'
    case 'downloaded':
      return 'bg-emerald-500'
    case 'error':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground/50'
  }
}

/** Pulses until the CSS animation completes one cycle, then holds steady —
 * enough motion to catch the eye once without a permanently blinking sidebar. */
function PulseOnceDot({ className }: { className: string }): React.ReactElement {
  const [done, setDone] = useState(false)
  return (
    <span
      aria-hidden="true"
      onAnimationIteration={() => setDone(true)}
      className={cn(DOT_CLASS, className, !done && 'motion-safe:animate-pulse')}
    />
  )
}

interface NotesText {
  version: string
  text: string
}

/** Popover/modal content. Exported for direct unit tests — the hover popover
 * detaches too fast in jsdom for live-tree queries (see sidebar-scan-status).
 * `card` (popover) shows the compact header + capped scroll area; `dialog`
 * (modal body) drops the header (the modal chrome carries it) and lets the
 * modal own scrolling. */
export function UpdateNotesPanel({
  onExpand,
  variant = 'card'
}: {
  onExpand?: () => void
  variant?: 'card' | 'dialog'
}): React.ReactElement {
  const { t } = useTranslation()
  // Read-only view of the broadcast state — deliberately not useUpdate(), which
  // would fire a getPreferences IPC round-trip on every popover mount.
  const state = useAppStore((s) => s.updateState)
  const releaseNotes = state.releaseNotes
  const entries = useMemo(() => releaseNotes ?? [], [releaseNotes])
  const versionRange = formatVersionRange(entries, state.version)
  const expandable = onExpand !== undefined && (state.phase === 'available' || state.phase === 'downloaded')
  const bodyText = variant === 'card' ? 'text-xs' : 'text-sm'

  const notes = useMemo<NotesText[]>(
    () =>
      entries.map((entry) => ({
        version: entry.version,
        text: releaseNoteHtmlToText(entry.note)
      })),
    [entries]
  )

  return (
    <div
      data-testid="update-notes-panel"
      className={cn('flex flex-col gap-2', variant === 'card' ? 'w-64 p-3' : 'w-full', expandable && 'cursor-pointer')}
      onClick={expandable ? onExpand : undefined}
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
      onKeyDown={
        expandable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onExpand?.()
              }
            }
          : undefined
      }
      title={expandable ? t('update.notes.clickToExpand') : undefined}
    >
      {variant === 'card' && (
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(DOT_CLASS, dotColor(state.phase))} />
          <span className="text-xs font-medium text-foreground">{versionRange || t('update.notes.title')}</span>
          {state.phase === 'available' && (
            <span className="ml-auto text-[10px] font-medium leading-none text-primary">{t('update.notes.newBadge')}</span>
          )}
          {state.phase === 'downloaded' && (
            <span className="ml-auto text-[10px] font-medium leading-none text-emerald-500">{t('update.notes.readyBadge')}</span>
          )}
          {expandable && <Maximize2 aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
        </div>
      )}

      {state.phase === 'checking' && (
        <span className={cn('text-muted-foreground', bodyText)}>{t('update.indicator.checking')}</span>
      )}

      {state.phase === 'downloading' && (
        <span className={cn('tabular-nums text-muted-foreground', bodyText)}>
          {t('update.indicator.downloading', { percent: state.percent ?? 0 })}
        </span>
      )}

      {state.phase === 'error' && (
        <>
          <span data-testid="update-error-message" className={cn('break-all text-destructive', bodyText)}>
            {state.error}
          </span>
          <span className={cn('text-muted-foreground', bodyText)}>{t('update.notes.errorHint')}</span>
        </>
      )}

      {(state.phase === 'available' || state.phase === 'downloaded') &&
        (notes.length > 0 ? (
          <div className={cn('flex flex-col gap-2', variant === 'card' && 'max-h-56 overflow-y-auto')}>
            {notes.map((entry, index) => (
              <div key={`${entry.version}-${index}`} className="flex flex-col gap-0.5">
                {entry.version && (
                  <span className={cn('font-medium text-muted-foreground', variant === 'card' ? 'text-[11px]' : 'text-xs')}>
                    {versionTag(entry.version)}
                  </span>
                )}
                <p className={cn('whitespace-pre-line leading-relaxed text-muted-foreground', bodyText)}>{entry.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <span className={cn('italic text-muted-foreground', bodyText)}>{t('update.notes.empty')}</span>
        ))}
    </div>
  )
}

export function SidebarUpdateIndicator({ collapsed }: { collapsed: boolean }): React.ReactElement | null {
  const { t } = useTranslation()
  const { state, check, download, install } = useUpdate()
  const [modalOpen, setModalOpen] = useState(false)

  if (state.phase === 'idle' || state.phase === 'not-available') return null

  const version = state.version ? versionTag(state.version) : ''
  const percent = state.percent ?? 0
  const clickable = state.phase === 'available' || state.phase === 'downloaded' || state.phase === 'error'
  const modalVersionRange = formatVersionRange(state.releaseNotes ?? [], state.version)

  const label =
    state.phase === 'checking'
      ? t('update.indicator.checking')
      : state.phase === 'available'
        ? t('update.indicator.available', { version })
        : state.phase === 'downloading'
          ? t('update.indicator.downloading', { percent })
          : state.phase === 'downloaded'
            ? t('update.indicator.downloaded', { version })
            : t('update.indicator.error')

  const title =
    state.phase === 'error'
      ? (state.error ?? label)
      : state.phase === 'available'
        ? t('update.indicator.tooltip.download')
        : state.phase === 'downloaded'
          ? t('update.indicator.tooltip.install')
          : collapsed
            ? label
            : undefined

  const handleClick = (): void => {
    if (state.phase === 'available') download()
    else if (state.phase === 'downloaded') install()
    else if (state.phase === 'error') check()
  }

  // No data-testid here: FloatingPopover clones the trigger and stamps its own
  // triggerTestId over it — tests target `sidebar-update-trigger`.
  const trigger = collapsed ? (
    <button
      type="button"
      onClick={clickable ? handleClick : undefined}
      aria-label={label}
      title={title}
      className={cn(
        'titlebar-no-drag flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
        clickable ? 'cursor-pointer hover:bg-sidebar-accent/10' : 'cursor-default'
      )}
    >
      {state.phase === 'available' ? (
        <PulseOnceDot className={dotColor(state.phase)} />
      ) : (
        <span
          aria-hidden="true"
          className={cn(DOT_CLASS, dotColor(state.phase), (state.phase === 'checking' || state.phase === 'downloading') && 'motion-safe:animate-pulse')}
        />
      )}
    </button>
  ) : (
    <button
      type="button"
      onClick={clickable ? handleClick : undefined}
      aria-label={label}
      title={title}
      className={cn(
        'titlebar-no-drag flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors',
        clickable ? 'cursor-pointer hover:bg-sidebar-accent/10 hover:text-sidebar-foreground' : 'cursor-default'
      )}
    >
      {state.phase === 'available' && <PulseOnceDot className={dotColor(state.phase)} />}
      {(state.phase === 'downloaded' || state.phase === 'error') && (
        <span aria-hidden="true" className={cn(DOT_CLASS, dotColor(state.phase))} />
      )}
      {state.phase === 'downloading' && (
        <span className="inline-block h-0.5 w-12 shrink-0 overflow-hidden rounded-full bg-sidebar-accent/20">
          <span
            className="block h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <>
      <FloatingPopover
        trigger={trigger}
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'end' : 'start'}
        role="dialog"
        triggerTestId="sidebar-update-trigger"
        contentTestId="sidebar-update-popover"
        hoverBridge
      >
        <UpdateNotesPanel onExpand={() => setModalOpen(true)} />
      </FloatingPopover>
      <Modal isOpen={modalOpen} onOpenChange={setModalOpen} size="xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-baseline gap-2 border-b border-border">
            <span className="text-base font-semibold">{t('update.notes.title')}</span>
            {modalVersionRange && (
              <span className="text-sm font-normal text-muted-foreground">{modalVersionRange}</span>
            )}
          </ModalHeader>
          <ModalBody className="py-4">
            <UpdateNotesPanel variant="dialog" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
