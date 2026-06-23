import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { getWidgetDefinition } from './widget-registry'
import { WIDGET_CATALOG } from './widget-catalog'
import type { WidgetId } from './widget-types'
import type { WidgetLayoutItem } from '@/lib/dashboard-layout'

// GH-138 U5: iOS 小组件库式画廊 — 隐藏 widget 以缩放实时预览呈现 (非标题, 展示真实渲染), 点击取用加入网格。
// GH-150: sticky 浮动定位 + 从底部 crossfade 入场/离场移到外层 (overview 的 AnimatePresence + motion.div),
// 本组件只负责内容面板 (毛玻璃); 避免在带 transform 的祖先里放 backdrop-blur 失真。
export function WidgetLibrary({
  hidden,
  onAdd
}: {
  hidden: WidgetLayoutItem[]
  onAdd: (id: WidgetId) => void
}): React.ReactElement | null {
  const { t } = useTranslation()
  const items = hidden.map((item) => getWidgetDefinition(item.id)).filter((def) => def != null)

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t('overview.dashboard.hiddenWidgets')}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((def) => {
          const Preview = def.component
          const previewSize = WIDGET_CATALOG[def.id].defaultSize
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => onAdd(def.id)}
              aria-label={t('overview.dashboard.addWidget')}
              title={t(def.titleKey)}
              className="group relative shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card/80 text-left transition-all hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* 缩放实时预览: 渲染真实 widget, 0.5 缩放裁剪到固定预览框 (无标题, 内容即标识) */}
              <div className="pointer-events-none h-[104px] w-[208px] select-none">
                <div className="h-[208px] w-[416px] origin-top-left scale-50 p-3">
                  <Preview w={previewSize.w} />
                </div>
              </div>
              {/* hover 加号覆盖, 提示可取用 */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background shadow">
                  <Plus className="h-3.5 w-3.5" />
                  {t('overview.dashboard.addWidget')}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
