import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { ListVideo, Search } from 'lucide-react'
import type { SessionReplayEvent, SessionReplayEventKind } from '@shared/types/ipc'
import { Chip, Input } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import {
  buildReplayPositions,
  filterReplayEvents,
  formatReplayOffset,
  replayOffsetMs
} from '@/lib/replay-model'
import { useSessionReplay } from '@/hooks/use-ipc'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingState } from '@/components/shared/loading-state'
import { ReplayKindChip } from './replay-kind-chip'
import { ReplayKindFilter } from './replay-kind-filter'
import { ReplayScrubber } from './replay-scrubber'
import { ReplayDetailPanel, type ReplayPayloadState } from './replay-detail-panel'

// GH-116: 会话重放视图 — 参考 ClaudeConsole Sessions Debug 界面:
// 控制行 (类型多选 + 搜索 + 计数) → 时间轴刷子 → 事件流 (虚拟化) + 右侧详情面板。
// 选中/过滤状态由 session-detail 页持有, tab 切换不丢失。

export interface SessionReplayViewState {
  selectedEventId: string | null
  kindFilter: ReadonlySet<SessionReplayEventKind> | null
  searchQuery: string
}

interface SessionReplayProps {
  sessionId: string
  viewState: SessionReplayViewState
  onViewStateChange: (next: SessionReplayViewState) => void
  /** 事件总数加载完成后上抛 (tab 计数徽章用)。 */
  onLoadedCount?: (count: number | null) => void
}

export function SessionReplay({
  sessionId,
  viewState,
  onViewStateChange,
  onLoadedCount
}: SessionReplayProps): React.ReactElement {
  const { t } = useTranslation()
  const { replay, loading, error, reload } = useSessionReplay(sessionId)
  const { selectedEventId, kindFilter, searchQuery } = viewState
  const listRef = useRef<VirtuosoHandle | null>(null)

  const events = useMemo(() => replay?.events ?? [], [replay?.events])
  const filtered = useMemo(
    () => filterReplayEvents(events, kindFilter, searchQuery),
    [events, kindFilter, searchQuery]
  )
  const positions = useMemo(
    () => buildReplayPositions(filtered, replay?.startedAt ?? null, replay?.endedAt ?? null),
    [filtered, replay?.startedAt, replay?.endedAt]
  )
  const startMs = useMemo(() => {
    if (!replay?.startedAt) return null
    const ms = Date.parse(replay.startedAt)
    return Number.isNaN(ms) ? null : ms
  }, [replay?.startedAt])
  const kindCounts = useMemo(() => {
    const counts = new Map<SessionReplayEventKind, number>()
    for (const event of events) counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1)
    return counts
  }, [events])

  const selectedIndex = useMemo(
    () => (selectedEventId ? filtered.findIndex((event) => event.id === selectedEventId) : -1),
    [filtered, selectedEventId]
  )
  const selectedEvent = selectedIndex >= 0 ? filtered[selectedIndex] : null

  useEffect(() => {
    onLoadedCount?.(replay ? replay.events.length : null)
  }, [onLoadedCount, replay])

  const setViewState = useCallback(
    (patch: Partial<SessionReplayViewState>) => {
      onViewStateChange({ selectedEventId, kindFilter, searchQuery, ...patch })
    },
    [kindFilter, onViewStateChange, searchQuery, selectedEventId]
  )

  const selectByIndex = useCallback(
    (index: number, scroll: boolean) => {
      const event = filtered[index]
      if (!event) return
      setViewState({ selectedEventId: event.id })
      if (scroll) listRef.current?.scrollToIndex({ index, align: 'center' })
    },
    [filtered, setViewState]
  )

  // payload 按需取 + 组件内缓存 (同事件来回点不重复 IPC)
  const payloadCacheRef = useRef(new Map<string, string>())
  const [payloadState, setPayloadState] = useState<ReplayPayloadState>({ status: 'loading' })

  useEffect(() => {
    if (!selectedEvent) return
    const eventId = selectedEvent.id
    const cached = payloadCacheRef.current.get(eventId)
    if (cached != null) {
      setPayloadState({ status: 'ready', json: cached })
      return
    }
    let cancelled = false
    setPayloadState({ status: 'loading' })
    window.api.sessions
      .eventPayload(sessionId, eventId)
      .then((payload) => {
        if (cancelled) return
        if (!payload) {
          setPayloadState({ status: 'error' })
          return
        }
        payloadCacheRef.current.set(eventId, payload.json)
        setPayloadState({ status: 'ready', json: payload.json })
      })
      .catch(() => {
        if (!cancelled) setPayloadState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [selectedEvent, sessionId])

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (filtered.length === 0) return
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = selectedIndex < 0 ? 0 : Math.min(filtered.length - 1, Math.max(0, selectedIndex + delta))
      selectByIndex(next, true)
    },
    [filtered.length, selectByIndex, selectedIndex]
  )

  if (loading && !replay) {
    return (
      <LoadingState
        icon={ListVideo}
        title={t('sessions.replay.payloadLoading')}
        description={t('sessions.loadingDetailDescription')}
        rows={4}
      />
    )
  }

  if (error && !replay) {
    return (
      <ErrorState
        title={t('sessions.replay.errorTitle')}
        description={t('sessions.replay.errorDescription')}
        onRetry={reload}
      />
    )
  }

  if (!replay || replay.events.length === 0) {
    return (
      <EmptyState
        icon={ListVideo}
        title={t('sessions.replay.emptyTitle')}
        description={t('sessions.replay.emptyDescription')}
      />
    )
  }

  return (
    <section data-testid="session-replay" className="min-w-0 space-y-3">
      {/* 控制行 */}
      <div className="flex flex-wrap items-center gap-2">
        <ReplayKindFilter
          selected={kindFilter}
          counts={kindCounts}
          onChange={(next) => setViewState({ kindFilter: next })}
        />
        <Input
          aria-label={t('sessions.replay.searchAriaLabel')}
          data-testid="replay-search"
          size="sm"
          variant="bordered"
          placeholder={t('sessions.replay.searchPlaceholder')}
          value={searchQuery}
          onValueChange={(value) => setViewState({ searchQuery: value })}
          startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
          isClearable
          onClear={() => setViewState({ searchQuery: '' })}
          className="w-56"
          classNames={{ inputWrapper: 'h-9 min-h-9' }}
        />
        <span className="text-xs tabular-nums text-muted-foreground">
          {t('sessions.replay.showing', {
            shown: formatNumber(filtered.length),
            total: formatNumber(replay.events.length)
          })}
        </span>
        {replay.truncated && (
          <Chip tone="warning" variant="flat" size="sm">
            {t('sessions.replay.truncatedNotice', {
              shown: formatNumber(replay.events.length),
              total: formatNumber(replay.totalEvents)
            })}
          </Chip>
        )}
      </div>

      {/* 时间轴刷子 */}
      <ReplayScrubber
        positions={positions}
        selectedIndex={selectedIndex}
        onSelect={(index) => selectByIndex(index, true)}
        ariaLabel={t('sessions.replay.scrubberLabel')}
        ariaValueText={
          selectedIndex >= 0
            ? `${selectedIndex + 1} / ${filtered.length} · ${formatReplayOffset(
                replayOffsetMs(filtered[selectedIndex]?.timestamp ?? null, startMs)
              )}`
            : undefined
        }
      />

      {/* 事件流 + 详情面板 */}
      <div className="flex min-h-[420px] gap-3 max-lg:flex-col lg:h-[calc(100vh-21rem)]">
        {filtered.length === 0 ? (
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <EmptyState
              icon={ListVideo}
              title={t('sessions.replay.noResultsTitle')}
              description={t('sessions.replay.noResultsDescription')}
            />
          </div>
        ) : (
          <div
            role="listbox"
            aria-label={t('sessions.replay.listLabel')}
            data-testid="replay-event-list"
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            className="min-h-[320px] min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Virtuoso
              ref={listRef}
              data={filtered}
              computeItemKey={(_, event) => event.id}
              defaultItemHeight={36}
              increaseViewportBy={{ top: 240, bottom: 240 }}
              itemContent={(index, event) => (
                <ReplayEventRow
                  event={event}
                  selected={index === selectedIndex}
                  offsetMs={replayOffsetMs(event.timestamp, startMs)}
                  sidechainLabel={t('sessions.replay.sidechain')}
                  onSelect={() => selectByIndex(index, false)}
                />
              )}
              style={{ height: '100%' }}
            />
          </div>
        )}

        {selectedEvent && (
          <ReplayDetailPanel
            event={selectedEvent}
            offsetMs={replayOffsetMs(selectedEvent.timestamp, startMs)}
            payload={payloadState}
            onClose={() => setViewState({ selectedEventId: null })}
            className="w-full shrink-0 lg:w-[400px] xl:w-[440px] max-lg:max-h-[420px]"
          />
        )}
      </div>
    </section>
  )
}

function ReplayEventRow({
  event,
  selected,
  offsetMs,
  sidechainLabel,
  onSelect
}: {
  event: SessionReplayEvent
  selected: boolean
  offsetMs: number | null
  sidechainLabel: string
  onSelect: () => void
}): React.ReactElement {
  return (
    <div className="px-1.5 py-px">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        data-testid={`replay-event-${event.id}`}
        onClick={onSelect}
        className={cn(
          'grid w-full grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-2 rounded-medium px-2 py-1.5 text-left transition-colors',
          selected ? 'bg-primary/10' : 'hover:bg-default-100'
        )}
      >
        <span className="flex min-w-0 items-center">
          <ReplayKindChip event={event} />
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {event.sidechain && (
            <span
              title={sidechainLabel}
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
            />
          )}
          {event.toolName && (
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{event.toolName}</span>
          )}
          <span className="truncate text-xs text-card-foreground" title={event.summary}>
            {event.summary}
          </span>
        </span>
        <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatReplayOffset(offsetMs)}
        </span>
      </button>
    </div>
  )
}
