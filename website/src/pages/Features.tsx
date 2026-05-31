import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

interface Feature {
  name: string
  title: string
  body: string
  points: string[]
}

export function Features() {
  const { t } = useTranslation()
  const lang = useLang()
  const items = t('features.items', { returnObjects: true }) as Feature[]

  return (
    <>
      <Seo lang={lang} path="/features" title={t('meta.features.title')} description={t('meta.features.description')} />
      <section className="container-page py-16 sm:py-20">
        <span className="eyebrow">{t('features.eyebrow')}</span>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t('features.heading')}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t('pages.featuresIntro')}</p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {items.map((f) => (
            <article key={f.name} className="bg-surface p-7">
              <span className="font-mono text-xs font-medium text-harbor-deep">{f.name}</span>
              <h2 className="mt-2 text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {f.points.map((p) => (
                  <li key={p} className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted">
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <Link to={`/${lang}/knowledge`} className="btn-ghost mt-10">
          {t('bridge.cta')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  )
}
