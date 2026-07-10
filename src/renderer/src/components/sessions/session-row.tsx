import { Clock, Coins, FolderOpen, Plug, Sparkles } from 'lucide-react'
import type { SessionSummary } from '@shared/types/asset'
import { Chip } from '@/components/ui'
import {
  formatOptionalCurrency,
  formatOptionalDuration,
  formatOptionalRelativeTime
} from '@/lib/utils'
import { agentDisplayName } from '@/lib/agent-meta'
import { AssetCountChip } from './asset-count-chip'
import { TokenSparkBar } from './token-spark-bar'

// GH-116: 列表行重设计 — 两行制 (~64px):
// 行1 = 标题 (检索主键, 占满) + agent chip + cost + token spark (右对齐数值区);
// 行2 = 时间·时长·模型·skills/mcp 计数 (+ 非项目分组时的项目名)。
// 行为保留: borderless + rounded-medium hover (HeroUI listbox-item tokens), testid 不变。

export interface SessionRowProps {
  session: SessionSummary
  unknownLabel: string
  skillsLabel: string
  mcpLabel: string
  fallbackTitle: string
  /** 非项目分组 (date/none) 时显示项目名, 项目分组下由组头承担。 */
  showProject?: boolean
  onOpen: () => void
}

export function SessionRow({
  session,
  unknownLabel,
  skillsLabel,
  mcpLabel,
  fallbackTitle,
  showProject = false,
  onOpen
}: SessionRowProps): React.ReactElement {
  const agentLabel = agentDisplayName(session.agentId)
  return (
    <div className="px-2">
      <button
        type="button"
        data-testid={`session-row-${session.id}`}
        onClick={onOpen}
        className="grid w-full gap-0.5 rounded-medium px-2 py-1.5 text-left transition-colors hover:bg-default-100"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {session.title || fallbackTitle}
          </span>
          <Chip tone="neutral" variant="flat" size="sm" className="shrink-0">
            {agentLabel}
          </Chip>
          <span className="hidden w-16 shrink-0 justify-end lg:flex">
            {session.cost != null && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                <Coins className="h-3 w-3" aria-hidden="true" />
                {formatOptionalCurrency(session.cost)}
              </span>
            )}
          </span>
          <span className="hidden w-32 shrink-0 justify-end md:flex">
            {/* 未解析出 token 的会话 (常见于 Codex rollout) 整列 "0 tok" 是纯噪音, 与 cost 列一样缺数据留空 */}
            {session.tokenUsage.totalTokens > 0 && <TokenSparkBar usage={session.tokenUsage} className="text-xs" />}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatOptionalRelativeTime(session.startedAt)}
          </span>
          <span className="hidden shrink-0 whitespace-nowrap sm:inline">
            {formatOptionalDuration(session.duration)}
          </span>
          <span className="hidden max-w-[14rem] truncate sm:inline" title={session.model || undefined}>
            {session.model || unknownLabel}
          </span>
          <AssetCountChip
            icon={Sparkles}
            iconClassName="text-primary"
            count={session.skillsUsed.length}
            names={session.skillsUsed}
            label={skillsLabel}
          />
          <AssetCountChip
            icon={Plug}
            iconClassName="text-green-500"
            count={session.mcpServers.length}
            names={session.mcpServers}
            label={mcpLabel}
          />
          {showProject && session.project && (
            <span className="ml-auto inline-flex min-w-0 items-center gap-1 truncate" title={session.projectPath || session.project}>
              <FolderOpen className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{session.project}</span>
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
