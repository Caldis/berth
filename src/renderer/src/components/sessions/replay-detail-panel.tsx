import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { SessionReplayEvent } from '@shared/types/ipc'
import { Button, Chip, ScrollShadow, Spinner } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import {
  formatReplayPayload,
  tokenizeJson,
  MAX_PAYLOAD_RENDER_LENGTH,
  type JsonTokenType
} from '@/lib/json-highlight'
import { formatReplayOffset } from '@/lib/replay-model'
import { ReplayKindChip } from './replay-kind-chip'

// GH-116: 选中事件详情面板 — 参考 Debug 视图右栏: 类型徽章 + 时间/ID 元信息 +
// 原始 JSONL 记录 (语法着色等宽渲染, 超长截断)。payload 按需取数, 状态由父组件持有。

export type ReplayPayloadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; json: string }

const TOKEN_CLASS: Record<JsonTokenType, string | undefined> = {
  key: 'text-sky-600 dark:text-sky-400',
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-amber-600 dark:text-amber-400',
  literal: 'text-purple-600 dark:text-purple-400',
  punctuation: 'text-muted-foreground',
  text: undefined
}

interface ReplayDetailPanelProps {
  event: SessionReplayEvent
  offsetMs: number | null
  payload: ReplayPayloadState
  onClose: () => void
  className?: string
}

export function ReplayDetailPanel({
  event,
  offsetMs,
  payload,
  onClose,
  className
}: ReplayDetailPanelProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <aside
      data-testid="replay-detail-panel"
      aria-label={t('sessions.replay.detailTitle')}
      className={cn('flex min-h-0 flex-col rounded-xl border border-border bg-card', className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <ReplayKindChip event={event} />
        {event.toolName && (
          <span className="truncate font-mono text-xs text-card-foreground">{event.toolName}</span>
        )}
        {event.sidechain && (
          <Chip tone="neutral" variant="bordered" size="sm">
            {t('sessions.replay.sidechain')}
          </Chip>
        )}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label={t('sessions.replay.closeDetail')}
          onPress={onClose}
          className="ml-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-xs">
        <MetaField label={t('sessions.replay.offset')} value={formatReplayOffset(offsetMs)} mono />
        <MetaField
          label={t('sessions.replay.timestamp')}
          value={event.timestamp ? formatAbsoluteTimestamp(event.timestamp) : '—'}
        />
        <MetaField label={t('sessions.replay.eventId')} value={event.id} mono />
        {event.tokens && (
          <MetaField
            label={t('sessions.tokens')}
            value={`${formatNumber(event.tokens.input ?? 0)} → ${formatNumber(event.tokens.output ?? 0)}`}
            mono
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
        <p className="pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t('sessions.replay.payloadTitle')}
        </p>
        <PayloadBody payload={payload} />
      </div>
    </aside>
  )
}

function PayloadBody({ payload }: { payload: ReplayPayloadState }): React.ReactElement {
  const { t } = useTranslation()

  if (payload.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
        <Spinner size="sm" />
        {t('sessions.replay.payloadLoading')}
      </div>
    )
  }

  if (payload.status === 'error') {
    return (
      <p className="py-6 text-xs text-muted-foreground">{t('sessions.replay.payloadError')}</p>
    )
  }

  return <PayloadJson json={payload.json} />
}

function PayloadJson({ json }: { json: string }): React.ReactElement {
  const { t } = useTranslation()
  const formatted = useMemo(() => formatReplayPayload(json), [json])
  const tokens = useMemo(() => tokenizeJson(formatted.text), [formatted.text])

  return (
    <>
      {formatted.truncated && (
        <p className="pb-1.5 text-[11px] text-warning">
          {t('sessions.replay.payloadTruncated', { limit: formatNumber(MAX_PAYLOAD_RENDER_LENGTH) })}
        </p>
      )}
      <ScrollShadow className="min-h-0 flex-1 rounded-lg bg-muted/40 p-2.5">
        <pre data-testid="replay-payload-json" className="whitespace-pre-wrap break-all font-mono text-[11px] leading-4 text-card-foreground">
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.type]}>
              {token.text}
            </span>
          ))}
        </pre>
      </ScrollShadow>
    </>
  )
}

function MetaField({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}): React.ReactElement {
  return (
    <span className="min-w-0">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('block truncate text-card-foreground', mono && 'font-mono')} title={value}>
        {value}
      </span>
    </span>
  )
}

function formatAbsoluteTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
