import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { JsonLd } from '@/components/JsonLd'
import { getArticles, PILLAR_ORDER } from '@/content'
import { useLang } from '@/lib/useLang'
import { SITE_URL } from '@/lib/site'
import { collectionLd } from '@/lib/schema'

interface Pillar {
  tag: string
  title: string
  body: string
  cta: string
}

export function KnowledgeHub() {
  const { t } = useTranslation()
  const lang = useLang()
  const base = `/${lang}`
  const pillars = t('kb.pillars', { returnObjects: true }) as Pillar[]
  const collectionItems = getArticles(lang).map((a) => ({
    name: a.title,
    url: `${SITE_URL}/${lang}/knowledge/${a.pillar}/${a.slug}`,
  }))

  return (
    <>
      <Seo lang={lang} path="/knowledge" title={t('meta.knowledge.title')} description={t('meta.knowledge.description')} />
      <JsonLd
        data={collectionLd({
          lang,
          name: t('meta.knowledge.title'),
          description: t('meta.knowledge.description'),
          url: `${SITE_URL}/${lang}/knowledge`,
          items: collectionItems,
        })}
      />
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{t('kb.eyebrow')}</span>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-[2.75rem]">{t('kb.heading')}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{t('pages.knowledgeIntro')}</p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl space-y-12">
          {PILLAR_ORDER.map((key, i) => {
            const meta = pillars[i]
            const articles = getArticles(lang, key)
            return (
              <section key={key} id={key} className="scroll-mt-24">
                <div className="flex items-baseline gap-3">
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink">{meta?.tag}</span>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">{meta?.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{meta?.body}</p>

                {articles.length > 0 ? (
                  <ul className="mt-5 divide-y divide-line overflow-hidden rounded-3xl border border-line">
                    {articles.map((a) => (
                      <li key={a.slug}>
                        <Link
                          to={`${base}/knowledge/${a.pillar}/${a.slug}`}
                          className="group flex items-center gap-4 bg-surface px-6 py-5 transition-colors hover:bg-cream"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{a.title}</div>
                            <p className="mt-1 truncate text-sm text-muted">{a.summary}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 rounded-3xl border border-dashed border-line bg-cream/50 px-6 py-5 text-sm text-muted">
                    {t('pages.knowledgeEmpty')}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </section>
    </>
  )
}
