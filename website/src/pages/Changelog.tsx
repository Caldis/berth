import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

interface Entry {
  version: string
  date: string
  notes: string[]
}

export function Changelog() {
  const { t } = useTranslation()
  const lang = useLang()
  const items = t('pages.changelog.items', { returnObjects: true }) as Entry[]

  return (
    <>
      <Seo lang={lang} path="/changelog" title={t('meta.changelog.title')} description={t('meta.changelog.description')} />
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{t('footer.changelogLink')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t('meta.changelog.title')}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{t('pages.changelog.intro')}</p>

          <div className="mt-12 space-y-10">
            {items.map((entry) => (
              <article key={entry.version} className="relative border-l border-line pl-6">
                <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-harbor bg-paper" />
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-xl font-semibold">{entry.version}</h2>
                  <span className="font-mono text-xs text-muted">{entry.date}</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {entry.notes.map((note) => (
                    <li key={note} className="flex items-start gap-2 text-sm text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-harbor" />
                      {note}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
