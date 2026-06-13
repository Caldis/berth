import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

interface Feature {
  name: string
  title: string
  body: string
  points: string[]
}

interface EngineMetric {
  label: string
  value: string
  body: string
}

interface EngineControl {
  label: string
  body: string
}

interface EngineSection {
  eyebrow: string
  title: string
  body: string
  metrics: EngineMetric[]
  controlsTitle: string
  controls: EngineControl[]
}

interface AdapterItem {
  name: string
  status: string
  body: string
}

interface AdapterSection {
  eyebrow: string
  title: string
  body: string
  items: AdapterItem[]
}

interface SafetySection {
  eyebrow: string
  title: string
  items: string[]
}

export function Features() {
  const { t } = useTranslation()
  const lang = useLang()
  const items = t('features.items', { returnObjects: true }) as Feature[]
  const engine = t('features.engine', { returnObjects: true }) as EngineSection
  const adapters = t('features.adapters', { returnObjects: true }) as AdapterSection
  const safety = t('features.safety', { returnObjects: true }) as SafetySection

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

        <section className="mt-16 border-t border-line pt-14">
          <span className="eyebrow">{engine.eyebrow}</span>
          <div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">{engine.title}</h2>
              <p className="mt-4 text-base leading-relaxed text-muted">{engine.body}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {engine.metrics.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="font-mono text-xs text-muted">{metric.label}</div>
                  <div className="mt-2 break-words font-display text-xl font-semibold">{metric.value}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{metric.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-line bg-cream p-6">
            <h3 className="text-sm font-semibold">{engine.controlsTitle}</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {engine.controls.map((control) => (
                <div key={control.label} className="flex gap-3 rounded-2xl bg-surface p-4">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-harbor" />
                  <div>
                    <div className="text-sm font-semibold">{control.label}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{control.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-14">
          <span className="eyebrow">{adapters.eyebrow}</span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{adapters.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{adapters.body}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {adapters.items.map((adapter) => (
              <article key={adapter.name} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{adapter.name}</h3>
                  <span className="rounded-md bg-cream px-2 py-1 font-mono text-[10px] text-muted">
                    {adapter.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{adapter.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-line bg-surface p-7">
          <span className="eyebrow">{safety.eyebrow}</span>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{safety.title}</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {safety.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-harbor" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <Link to={`/${lang}/knowledge`} className="btn-ghost mt-10">
          {t('bridge.cta')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  )
}
