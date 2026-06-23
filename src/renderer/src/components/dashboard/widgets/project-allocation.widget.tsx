import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsageSummary } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import { formatCompactNumber } from '@/lib/utils'
import { projectPathForScope } from '@shared/scope'
import type { WidgetRenderProps } from '../widget-types'

// GH-138 R2-C/T3: 项目分布 widget — 新维度 (项目, 非模型/时间)。usage.byProject 现成数据,
// 形态刻意区别于 model-distribution (排行条/饼): 单条**份额分配条** (token 占比横向堆叠) + 排名行。
// 克制美学: 不用分类彩色, 改 primary 单色不透明度阶梯 (从重到轻), 超出 Top-N 收为 "其他" 极淡段。
// 尺寸即信息: W1=单条 + 头部项目一瞥 · 否则 Top-5 行。

interface Segment {
  key: string
  label: string
  tokens: number
  percentage: number
  alpha: number
}

function tintAlpha(index: number): number {
  return Math.max(0.18, 0.92 - index * 0.13)
}

export function ProjectAllocationWidget({ w, h }: WidgetRenderProps): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const agentView = useAppStore((s) => s.agentView)
  const { usage, loading } = useUsageSummary(30, agentView, projectPath)

  const limit = 5
  const all = useMemo(
    () => [...(usage?.byProject ?? [])].sort((a, b) => b.tokens - a.tokens),
    [usage?.byProject]
  )
  const top = all.slice(0, limit)
  const totalTokens = useMemo(() => all.reduce((sum, p) => sum + p.tokens, 0), [all])

  const segments = useMemo<Segment[]>(() => {
    const segs: Segment[] = top.map((p, i) => ({
      key: p.project,
      label: p.project,
      tokens: p.tokens,
      percentage: p.percentage,
      alpha: tintAlpha(i)
    }))
    const restTokens = all.slice(limit).reduce((sum, p) => sum + p.tokens, 0)
    if (restTokens > 0 && totalTokens > 0) {
      segs.push({
        key: '__rest__',
        label: t('overview.dashboard.projectAllocation.others'),
        tokens: restTokens,
        percentage: Math.round((restTokens / totalTokens) * 100),
        alpha: 0
      })
    }
    return segs
  }, [top, all, limit, totalTokens, t])

  if (loading && !usage) {
    return (
      <div className="space-y-2.5">
        <div className="h-2 w-full animate-pulse rounded-full bg-muted/60" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/60" />
        ))}
      </div>
    )
  }
  if (top.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.dashboard.heatmap.empty')}</p>
  }

  // 份额分配条 — 单条 100% 宽, 各项目按 token 份额堆叠; 单色不透明度阶梯; "其他" 段走极淡 muted。
  const shareBar = (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
      {segments.map((seg) => (
        <div
          key={seg.key}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${totalTokens > 0 ? (seg.tokens / totalTokens) * 100 : 0}%`,
            backgroundColor: seg.alpha > 0 ? `hsl(var(--primary) / ${seg.alpha})` : 'hsl(var(--muted-foreground) / 0.22)'
          }}
          title={`${seg.label} · ${seg.percentage}%`}
        />
      ))}
    </div>
  )

  // S: 一瞥 — 份额条 + 头部项目 (最大占比) 名称 + 百分比。无行列表。
  if (w === 'W1') {
    const lead = top[0]
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium text-foreground" title={lead.project}>
            {lead.project}
          </span>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{lead.percentage}%</span>
        </div>
        {shareBar}
        <span className="text-xs text-muted-foreground">
          {t('overview.dashboard.projectAllocation.acrossProjects', { count: all.length })}
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {shareBar}
      <ul className="space-y-1.5">
        {top.map((entry, i) => (
          <li key={entry.project} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: `hsl(var(--primary) / ${tintAlpha(i)})` }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={entry.project}>
              {entry.project}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatCompactNumber(entry.tokens)}
              <span className="ml-1.5 text-foreground">{entry.percentage}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
