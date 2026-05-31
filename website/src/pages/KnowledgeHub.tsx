import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

interface Pillar {
  tag: string
  title: string
  body: string
  cta: string
}

export function KnowledgeHub() {
  const { t } = useTranslation()
  const lang = useLang()
  const pillars = t('kb.pillars', { returnObjects: true }) as Pillar[]

  return (
    <>
      <Seo lang={lang} path="/knowledge" title={t('meta.knowledge.title')} description={t('meta.knowledge.description')} />
      <section className="container-page py-16 sm:py-20">
        <span className="eyebrow">{t('kb.eyebrow')}</span>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t('kb.heading')}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t('pages.knowledgeIntro')}</p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="card flex flex-col">
              <span className="self-start rounded-full bg-harbor/10 px-2.5 py-1 text-xs font-medium text-harbor-deep">
                {p.tag}
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-harbor/70">
                {p.cta}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
