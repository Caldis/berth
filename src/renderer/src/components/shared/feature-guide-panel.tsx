import { BookOpen, ChevronDown, ExternalLink, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { FeatureGuideDefinition, FeatureGuideEvidence } from '@/lib/feature-guidance'
import type { AgentView } from '@shared/types/asset'

interface FeatureGuidePanelProps {
  guide: FeatureGuideDefinition
  evidence?: FeatureGuideEvidence[]
  agentView?: AgentView
  className?: string
}

export function FeatureGuidePanel({
  guide,
  evidence = [],
  agentView = 'all',
  className
}: FeatureGuidePanelProps): React.ReactElement {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const insights = useMemo(
    () => (guide.insightKeys ?? []).filter((item) => item.agentView == null || item.agentView === agentView),
    [agentView, guide.insightKeys]
  )
  const pointKeys = guide.pointKeys ?? []
  const providerMappings = guide.providerMappings ?? []
  const docLinks = guide.docLinks ?? []
  const hasDetails = pointKeys.length > 0 || providerMappings.length > 0 || docLinks.length > 0

  const openDoc = (url: string): void => {
    void window.api?.shell.openExternal(url)
  }

  return (
    <section className={cn('rounded-lg border border-border bg-card px-4 py-3', className)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t(guide.titleKey)}</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t(guide.summaryKey)}</p>
            </div>
            {hasDetails && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {expanded ? t('assetGuide.hideDetails') : t('assetGuide.showDetails')}
                <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
          </div>

          {evidence.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {evidence.map((item) => (
                <span
                  key={item.labelKey}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                    item.tone === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  <span className="font-semibold text-foreground">{item.value}</span>
                  {t(item.labelKey)}
                </span>
              ))}
            </div>
          )}

          {insights.length > 0 && (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {insights.map((item) => (
                <div key={`${item.titleKey}:${item.bodyKey}`} className="rounded-md border border-border/70 bg-background/60 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{t(item.titleKey)}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t(item.bodyKey)}</p>
                </div>
              ))}
            </div>
          )}

          {expanded && hasDetails && (
            <div className="mt-4 border-t border-border pt-3">
              {pointKeys.length > 0 && (
                <ul className="grid gap-1.5 text-xs leading-5 text-muted-foreground md:grid-cols-3">
                  {pointKeys.map((key) => (
                    <li key={key} className="flex gap-1.5">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {providerMappings.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-md border border-border">
                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)] border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                    <span>{t('assetGuide.providerMap.provider')}</span>
                    <span>{t('assetGuide.providerMap.config')}</span>
                    <span>{t('assetGuide.providerMap.meaning')}</span>
                  </div>
                  {providerMappings.map((row) => (
                    <div
                      key={`${row.provider}:${row.config}`}
                      className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b border-border/50 px-3 py-2 text-xs last:border-b-0"
                    >
                      <span className="font-medium text-foreground">{row.provider}</span>
                      <span className="truncate font-mono text-muted-foreground">{row.config}</span>
                      <span className="text-muted-foreground">{t(row.meaningKey)}</span>
                    </div>
                  ))}
                </div>
              )}

              {docLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {docLinks.map((doc) => (
                    <button
                      key={doc.url}
                      type="button"
                      onClick={() => openDoc(doc.url)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span>{t(doc.labelKey)}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
