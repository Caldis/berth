import { BookOpen, ExternalLink, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AssetGuideDefinition } from '@/lib/asset-guidance'

interface AssetGuidePanelProps {
  guide: AssetGuideDefinition
}

export function AssetGuidePanel({ guide }: AssetGuidePanelProps): React.ReactElement {
  const { t } = useTranslation()

  const openDoc = (url: string): void => {
    void window.api?.shell.openExternal(url)
  }

  return (
    <section className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Info className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{t(guide.titleKey)}</h2>
          <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{t(guide.summaryKey)}</p>
          <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-muted-foreground md:grid-cols-3">
            {guide.pointKeys.map((key) => (
              <li key={key} className="flex gap-1.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          {guide.docLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.docLinks.map((doc) => (
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
      </div>
    </section>
  )
}
