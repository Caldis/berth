import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAppStore } from '@/stores/app'
import { assetMatchesAppScope, projectPathForScope } from '@shared/scope'
import { DashboardInsightsProvider } from '@/components/dashboard/insights-context'
import { AgentScopeSwitcher } from '@/components/dashboard/agent-scope-switcher'
import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { WidgetLibrary } from '@/components/dashboard/widget-library'
import { OnboardingBanner } from '@/components/dashboard/onboarding-banner'
import { useDashboardLayout } from '@/components/dashboard/use-dashboard-layout'
import { HealthEntry } from '@/components/dashboard/health/health-entry'

const DASHBOARD_ONBOARDED_KEY = 'berth-dashboard-onboarded'

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

// GH-138: Overview 重构为模块化可拖拽自定义仪表盘 host。toolbar (标题+健康入口+自定义切换)
// + DashboardGrid (widget 网格)。健康检查收拢进 HealthEntry 弹窗, 不再平铺。
// Provider 上移到整页外层 (OverviewContent 经 useInsights 取 agentSplit 给 toolbar 的 agent 切换器)。
function OverviewContent(): React.ReactElement {
  const { t } = useTranslation()
  const agentView = useAppStore((s) => s.agentView)
  const setAgentView = useAppStore((s) => s.setAgentView)
  const assets = useAppStore((s) => s.assets)
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  // 切换器选项 = 当前 scope 内"全部在场 agent", 且**不随 agentView 过滤收缩** — 必须取未过滤源,
  // 否则选中某 agent 后 insights.agentSplit 收缩到 1 项, 切换器自我隐藏 → 无法切回 (CDP 实测发现)。
  const agentSplit = useMemo(() => {
    const counts = new Map<string, number>()
    for (const asset of assets) {
      if (asset.type === 'session' && assetMatchesAppScope(asset, scopeSelection)) {
        counts.set(asset.agentId, (counts.get(asset.agentId) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([agentId, count]) => ({ agentId, count }))
      .sort((a, z) => z.count - a.count || a.agentId.localeCompare(z.agentId))
  }, [assets, scopeSelection])
  const [isEditing, setIsEditing] = useState(false)
  const [onboarded, setOnboarded] = useState(readOnboarded)
  const { visibleWidgets, hiddenWidgets, reorder, setSize, setChartType, hide, show, reset } = useDashboardLayout()

  const dismissOnboarding = (): void => {
    setOnboarded(true)
    try {
      localStorage.setItem(DASHBOARD_ONBOARDED_KEY, '1')
    } catch {
      /* storage unavailable — in-memory dismiss for this session */
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <header data-testid="overview-hero" className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('overview.kicker')}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{t('overview.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <AgentScopeSwitcher agents={agentSplit} value={agentView} onChange={setAgentView} />
          <HealthEntry />
          {isEditing && (
            <Button size="sm" variant="light" onPress={reset}>
              {t('overview.dashboard.reset')}
            </Button>
          )}
          <Button
            size="sm"
            variant={isEditing ? 'solid' : 'flat'}
            color={isEditing ? 'primary' : 'default'}
            onPress={() => setIsEditing((v) => !v)}
            startContent={isEditing ? <Check className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
          >
            {isEditing ? t('overview.dashboard.done') : t('overview.dashboard.customize')}
          </Button>
        </div>
      </header>

      {!onboarded && (
        <OnboardingBanner
          onCustomize={() => {
            setIsEditing(true)
            dismissOnboarding()
          }}
          onDismiss={dismissOnboarding}
        />
      )}

      <DashboardGrid
        widgets={visibleWidgets}
        isEditing={isEditing}
        onReorder={reorder}
        onSetSize={setSize}
        onSetChartType={setChartType}
        onHide={hide}
      />
      {isEditing && <WidgetLibrary hidden={hiddenWidgets} onAdd={show} />}
    </div>
  )
}

export function Overview(): React.ReactElement {
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)

  return (
    <DashboardInsightsProvider projectPath={projectPath}>
      <OverviewContent />
    </DashboardInsightsProvider>
  )
}
