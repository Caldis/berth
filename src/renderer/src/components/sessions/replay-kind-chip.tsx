import { useTranslation } from 'react-i18next'
import {
  Bot,
  Brain,
  CornerDownRight,
  Cpu,
  Settings2,
  User,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import type { SessionReplayEvent, SessionReplayEventKind } from '@shared/types/ipc'
import { Chip, type ChipTone } from '@/components/ui'

// GH-116: 重放事件类型徽章 — 五个语义 tone 内分配 (参考 Debug 视图的彩色类型标签),
// 失败的 tool/result 升 danger。列表行与详情面板共用。

interface ReplayKindMeta {
  tone: ChipTone
  icon: LucideIcon
}

const KIND_META: Record<SessionReplayEventKind, ReplayKindMeta> = {
  user: { tone: 'primary', icon: User },
  assistant: { tone: 'success', icon: Bot },
  thinking: { tone: 'warning', icon: Brain },
  tool: { tone: 'neutral', icon: Wrench },
  result: { tone: 'neutral', icon: CornerDownRight },
  model: { tone: 'neutral', icon: Cpu },
  system: { tone: 'neutral', icon: Settings2 }
}

export function replayKindTone(event: Pick<SessionReplayEvent, 'kind' | 'status'>): ChipTone {
  if ((event.kind === 'tool' || event.kind === 'result') && event.status === 'error') return 'danger'
  return KIND_META[event.kind].tone
}

export function ReplayKindChip({
  event,
  className
}: {
  event: Pick<SessionReplayEvent, 'kind' | 'status'>
  className?: string
}): React.ReactElement {
  const { t } = useTranslation()
  const Icon = KIND_META[event.kind].icon
  return (
    <Chip
      tone={replayKindTone(event)}
      variant="flat"
      size="sm"
      className={className}
      classNames={{ content: 'font-medium' }}
      startContent={<Icon className="ml-0.5 h-3 w-3" aria-hidden="true" />}
    >
      {t(`sessions.replay.kind.${event.kind}`)}
    </Chip>
  )
}
