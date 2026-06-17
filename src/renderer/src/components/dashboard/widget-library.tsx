import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { getWidgetDefinition } from './widget-registry'
import type { WidgetId } from './widget-types'
import type { WidgetLayoutItem } from '@/lib/dashboard-layout'

// GH-138: widget 库 (编辑态) — 列出已隐藏 widget, 点击加回。完成"完全自定义"闭环 (增/删/显隐)。
export function WidgetLibrary({
  hidden,
  onAdd
}: {
  hidden: WidgetLayoutItem[]
  onAdd: (id: WidgetId) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const items = hidden.map((item) => getWidgetDefinition(item.id)).filter((def) => def != null)

  return (
    <section className="rounded-lg border border-dashed border-border/70 px-4 py-3.5">
      <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {t('overview.dashboard.hiddenWidgets')}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('overview.dashboard.allVisible')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((def) => {
            const Icon = def.icon
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onAdd(def.id)}
                className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t(def.titleKey)}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
