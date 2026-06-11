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
import { Chip } from '@/components/ui'
import { cn } from '@/lib/utils'

// GH-120: 每种事件 kind 绑定独立图标 + 主题色 (--replay-* 变量, 随 light/dark 切换)。
// 染色经 classNames 注入取代 5-tone 语义 Chip; 失败的 tool/result 仍升 danger。
// 列表行、筛选器、时间轴、详情面板共用同一色源 (replayKindColorClasses)。

interface ReplayKindColorClasses {
  /** 全饱和前景 (文字/图标/色点)。 */
  text: string
  /** 低透明度背景 (chip 底色)。 */
  bg: string
}

const KIND_ICON: Record<SessionReplayEventKind, LucideIcon> = {
  user: User,
  assistant: Bot,
  thinking: Brain,
  tool: Wrench,
  result: CornerDownRight,
  model: Cpu,
  system: Settings2
}

const KIND_COLORS: Record<SessionReplayEventKind, ReplayKindColorClasses> = {
  user: { text: 'text-replay-user', bg: 'bg-replay-user/15' },
  assistant: { text: 'text-replay-assistant', bg: 'bg-replay-assistant/15' },
  thinking: { text: 'text-replay-thinking', bg: 'bg-replay-thinking/15' },
  tool: { text: 'text-replay-tool', bg: 'bg-replay-tool/15' },
  result: { text: 'text-replay-result', bg: 'bg-replay-result/15' },
  model: { text: 'text-replay-model', bg: 'bg-replay-model/15' },
  system: { text: 'text-replay-system', bg: 'bg-replay-system/15' }
}

const DANGER_COLORS: ReplayKindColorClasses = { text: 'text-danger', bg: 'bg-danger/15' }

export function replayKindIcon(kind: SessionReplayEventKind): LucideIcon {
  return KIND_ICON[kind]
}

export function replayKindColorClasses(
  kind: SessionReplayEventKind,
  status: SessionReplayEvent['status']
): ReplayKindColorClasses {
  if ((kind === 'tool' || kind === 'result') && status === 'error') return DANGER_COLORS
  return KIND_COLORS[kind]
}

export function ReplayKindChip({
  event,
  className
}: {
  event: Pick<SessionReplayEvent, 'kind' | 'status'>
  className?: string
}): React.ReactElement {
  const { t } = useTranslation()
  const Icon = KIND_ICON[event.kind]
  const colors = replayKindColorClasses(event.kind, event.status)
  return (
    <Chip
      variant="flat"
      size="sm"
      className={className}
      classNames={{
        base: colors.bg,
        content: cn('font-medium', colors.text)
      }}
      startContent={<Icon className={cn('ml-0.5 h-3 w-3', colors.text)} aria-hidden="true" />}
    >
      {t(`sessions.replay.kind.${event.kind}`)}
    </Chip>
  )
}
