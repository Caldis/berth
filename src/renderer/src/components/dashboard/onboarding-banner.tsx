import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui'

// GH-138: 首次 onboarding 横幅 — 介绍可自定义仪表盘 + widget 随活动填充, CTA 进编辑态。
// 可关闭 (localStorage 持久化, 由 overview 管理)。克制: 细边框 + 图标, 不堆灰块。
export function OnboardingBanner({
  onCustomize,
  onDismiss
}: {
  onCustomize: () => void
  onDismiss: () => void
}): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section className="relative flex items-start gap-3.5 rounded-xl border border-border px-4 py-4 pr-10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground">
        <LayoutDashboard className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t('overview.dashboard.onboarding.title')}</p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {t('overview.dashboard.onboarding.body')}
        </p>
        <div className="mt-3">
          <Button
            size="sm"
            variant="flat"
            startContent={<Settings2 className="h-3.5 w-3.5" />}
            onPress={onCustomize}
          >
            {t('overview.dashboard.onboarding.customize')}
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('overview.dashboard.onboarding.dismiss')}
        title={t('overview.dashboard.onboarding.dismiss')}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}
