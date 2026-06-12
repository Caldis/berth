import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { SessionReplayEventKind } from '@shared/types/ipc'
import { FilterSelect, SelectItem } from '@/components/ui'
import { cn, formatNumber } from '@/lib/utils'
import { REPLAY_KINDS } from '@/lib/replay-model'
import { replayKindColorClasses, replayKindIcon } from './replay-kind-chip'

// GH-120 AC2: 事件类型筛选器 — 选项行 = [Check 槽 | kind 图标(主题色) | 名称 | 计数]。
// Check 移到行首 (HeroUI 默认 selectedIcon 在行尾, 经 hideSelectedIcon 关闭后自渲染);
// 选中态由受控 selected 计算, 不依赖 listbox 内部状态。

interface ReplayKindFilterProps {
  /** null = 不过滤 (全部)。 */
  selected: ReadonlySet<SessionReplayEventKind> | null
  counts: ReadonlyMap<SessionReplayEventKind, number>
  onChange: (next: Set<SessionReplayEventKind> | null) => void
  className?: string
}

export function ReplayKindFilter({
  selected,
  counts,
  onChange,
  className
}: ReplayKindFilterProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <FilterSelect
      aria-label={t('sessions.replay.kindFilterLabel')}
      data-testid="replay-kind-filter"
      selectionMode="multiple"
      placeholder={t('sessions.replay.kindFilterAll')}
      selectedKeys={(selected ?? new Set()) as Set<string>}
      onSelectionChange={(keys) => {
        if (keys === 'all') {
          onChange(null)
          return
        }
        const next = new Set([...keys] as SessionReplayEventKind[])
        onChange(next.size === 0 ? null : next)
      }}
      renderValue={() => <TriggerSummary selected={selected} />}
      className={cn('w-44', className)}
    >
      {REPLAY_KINDS.map((kind) => {
        const Icon = replayKindIcon(kind)
        const colors = replayKindColorClasses(kind, undefined)
        const isSelected = selected?.has(kind) ?? false
        return (
          <SelectItem key={kind} textValue={t(`sessions.replay.kind.${kind}`)} hideSelectedIcon>
            <span className="flex items-center gap-2">
              <span
                data-testid={`replay-kind-check-${kind}`}
                aria-hidden="true"
                className="flex h-4 w-4 shrink-0 items-center justify-center"
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
              </span>
              <Icon className={cn('h-3.5 w-3.5 shrink-0', colors.text)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{t(`sessions.replay.kind.${kind}`)}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatNumber(counts.get(kind) ?? 0)}
              </span>
            </span>
          </SelectItem>
        )
      })}
    </FilterSelect>
  )
}

function TriggerSummary({
  selected
}: {
  selected: ReadonlySet<SessionReplayEventKind> | null
}): React.ReactElement | null {
  const { t } = useTranslation()
  if (!selected || selected.size === 0) return null
  const kinds = REPLAY_KINDS.filter((kind) => selected.has(kind))
  if (kinds.length > 2) {
    return <span>{t('sessions.replay.kindFilterSummary', { count: kinds.length })}</span>
  }
  return (
    <span className="flex items-center gap-1.5">
      {kinds.map((kind) => (
        <span key={kind} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={cn('h-2 w-2 rounded-full bg-current', replayKindColorClasses(kind, undefined).text)}
          />
          {t(`sessions.replay.kind.${kind}`)}
        </span>
      ))}
    </span>
  )
}
