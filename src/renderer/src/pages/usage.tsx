import { useTranslation } from 'react-i18next'
import { BarChart3, DollarSign, Coins, Gauge } from 'lucide-react'

export function Usage(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('usage.title')}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">{t('usage.totalSpent')}</span>
          </div>
          <p className="mt-2 text-2xl font-bold">$0.00</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span className="text-xs font-medium">{t('usage.tokensUsed')}</span>
          </div>
          <p className="mt-2 text-2xl font-bold">0</p>
        </div>
      </div>

      {/* Daily cost chart placeholder */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">{t('usage.dailyCost')}</h2>
        </div>
        <div className="flex h-48 items-center justify-center p-4">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          </div>
        </div>
      </div>

      {/* Rate limits */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">{t('usage.rateLimits')}</h2>
        </div>
        <div className="flex items-center justify-center p-4">
          <div className="text-center">
            <Gauge className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
