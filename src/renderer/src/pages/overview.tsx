import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Settings2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, MOTION } from '@/components/ui'
import { useAppStore } from '@/stores/app'
import { usePageChrome, type PageChromeConfig } from '@/components/layout/page-chrome'
import { projectPathForScope } from '@shared/scope'
import { DashboardInsightsProvider } from '@/components/dashboard/insights-context'
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

// GH-138: Overview 模块化可拖拽自定义仪表盘 host。toolbar (标题 + 健康入口 + 自定义切换) + DashboardGrid。
// agent 维度筛选已上移到侧栏全局 AgentScopeSwitcher (与 ProjectScopeSwitcher 并列, 一个项目/文件系统维度、
// 一个 agent 维度), 不在此 toolbar; 各 widget 经 store.agentView 自动响应全局过滤。
export function Overview(): React.ReactElement {
  const { t } = useTranslation()
  const scopeSelection = useAppStore((s) => s.scopeSelection)
  const projectPath = projectPathForScope(scopeSelection)
  const [isEditing, setIsEditing] = useState(false)
  const [onboarded, setOnboarded] = useState(readOnboarded)
  const {
    visibleWidgets,
    hiddenWidgets,
    lastAddedId,
    reorder,
    setWidth,
    setHeight,
    setChartType,
    hide,
    show,
    clearLastAdded,
    reset
  } = useDashboardLayout()

  const dismissOnboarding = (): void => {
    setOnboarded(true)
    try {
      localStorage.setItem(DASHBOARD_ONBOARDED_KEY, '1')
    } catch {
      /* storage unavailable — in-memory dismiss for this session */
    }
  }

  // 标题与工具按钮统一进顶栏 PageChrome — 页内 hero 与顶栏标题重复 (双「总览」)。
  const pageChromeActions = useMemo<React.ReactNode>(() => (
    <div className="flex items-center gap-2">
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
  ), [isEditing, reset, t])
  const pageChrome = useMemo<PageChromeConfig>(() => ({
    title: t('overview.title'),
    actions: pageChromeActions
  }), [pageChromeActions, t])
  usePageChrome(pageChrome, [pageChrome])

  return (
    <div className="space-y-6 pb-8">
      {!onboarded && (
        <OnboardingBanner
          onCustomize={() => {
            setIsEditing(true)
            dismissOnboarding()
          }}
          onDismiss={dismissOnboarding}
        />
      )}

      <DashboardInsightsProvider projectPath={projectPath}>
        <DashboardGrid
          widgets={visibleWidgets}
          isEditing={isEditing}
          lastAddedId={lastAddedId}
          onReorder={reorder}
          onSetWidth={setWidth}
          onSetHeight={setHeight}
          onSetChartType={setChartType}
          onHide={hide}
          onFocused={clearLastAdded}
        />
        <AnimatePresence>
          {isEditing && hiddenWidgets.length > 0 && (
            <motion.div
              key="widget-library"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: MOTION.duration.base, ease: MOTION.ease.standard }}
              className="sticky bottom-3 z-30 mt-2"
            >
              <WidgetLibrary hidden={hiddenWidgets} onAdd={show} />
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardInsightsProvider>
    </div>
  )
}
