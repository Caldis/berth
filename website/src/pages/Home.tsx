import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Eye,
  Layers,
  LayoutGrid,
  Lock,
  MessagesSquare,
  Settings,
} from 'lucide-react'
import { GithubIcon } from '@/components/GithubIcon'
import { Seo } from '@/components/Seo'
import { AssetPanel } from '@/components/AssetPanel'
import { useLang } from '@/lib/useLang'
import { GITHUB_URL, RELEASES_URL } from '@/lib/site'

interface NamedItem {
  title: string
  body: string
}
interface Feature extends NamedItem {
  name: string
  points: string[]
}
interface Pillar {
  tag: string
  title: string
  body: string
  cta: string
}
interface Faq {
  q: string
  a: string
}

const valueIcons = [Layers, LayoutGrid, Lock, Eye]
const featureIcons = [LayoutGrid, MessagesSquare, Settings, Activity]

function SectionHead({ eyebrow, heading }: { eyebrow: string; heading: string }) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
    </div>
  )
}

export function Home() {
  const { t } = useTranslation()
  const lang = useLang()
  const base = `/${lang}`

  const trust = t('trust.items', { returnObjects: true }) as string[]
  const values = t('value.items', { returnObjects: true }) as NamedItem[]
  const features = t('features.items', { returnObjects: true }) as Feature[]
  const pillars = t('kb.pillars', { returnObjects: true }) as Pillar[]
  const faqs = t('faq.items', { returnObjects: true }) as Faq[]

  return (
    <>
      <Seo lang={lang} path="" title={t('meta.home.title')} description={t('meta.home.description')} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--harbor) / 0.18), transparent)' }}
          aria-hidden
        />
        <div className="container-page grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="eyebrow animate-fade-up">{t('hero.badge')}</span>
            <h1
              className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight animate-fade-up sm:text-6xl"
              style={{ animationDelay: '60ms' }}
            >
              {t('hero.title')}
              <br />
              <span className="text-harbor">{t('hero.titleAccent')}</span>
            </h1>
            <p
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted animate-fade-up"
              style={{ animationDelay: '120ms' }}
            >
              {t('hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: '180ms' }}>
              <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary">
                <Download className="h-4 w-4" />
                {t('hero.ctaPrimary')}
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                <GithubIcon className="h-4 w-4" />
                {t('hero.ctaSecondary')}
              </a>
            </div>
            <p className="mt-5 font-mono text-xs text-muted animate-fade-up" style={{ animationDelay: '240ms' }}>
              {t('hero.note')}
            </p>
          </div>

          <div className="animate-fade-up lg:pl-6" style={{ animationDelay: '160ms' }}>
            <AssetPanel />
          </div>
        </div>

        {/* Trust strip */}
        <div className="border-y border-line bg-surface/60">
          <div className="container-page grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted">
                <Check className="h-4 w-4 shrink-0 text-harbor" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="container-page py-20 sm:py-24">
        <SectionHead eyebrow={t('value.eyebrow')} heading={t('value.heading')} />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {values.map((item, i) => {
            const Icon = valueIcons[i] ?? Layers
            return (
              <div key={item.title} className="bg-surface p-7">
                <Icon className="h-5 w-5 text-harbor" />
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line bg-surface/50">
        <div className="container-page py-20 sm:py-24">
          <SectionHead eyebrow={t('features.eyebrow')} heading={t('features.heading')} />
          <div className="mt-14 space-y-16">
            {features.map((feature, i) => {
              const Icon = featureIcons[i] ?? LayoutGrid
              const reverse = i % 2 === 1
              return (
                <div key={feature.name} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                  <div className={reverse ? 'lg:order-2' : ''}>
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-medium text-harbor-deep">
                      <Icon className="h-4 w-4" />
                      {feature.name}
                    </span>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-3 max-w-md leading-relaxed text-muted">{feature.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {feature.points.map((p) => (
                        <li
                          key={p}
                          className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted"
                        >
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={reverse ? 'lg:order-1' : ''}>
                    <div className="rounded-2xl border border-line bg-paper/50 p-8">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-harbor/12 text-harbor-deep">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="mt-6 space-y-2.5">
                        {feature.points.map((p, k) => (
                          <div key={p} className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-muted">{String(k + 1).padStart(2, '0')}</span>
                            <div className="h-8 flex-1 rounded-lg border border-line bg-surface px-3 text-sm leading-8 text-ink">
                              {p}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Knowledge bridge */}
      <section className="container-page py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-harbor/20 bg-harbor-soft/50 px-8 py-14 sm:px-14">
          <div className="max-w-2xl">
            <span className="eyebrow border-harbor/30 bg-surface/70">{t('bridge.eyebrow')}</span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('bridge.heading')}</h2>
            <p className="mt-4 leading-relaxed text-ink/80">{t('bridge.body')}</p>
            <Link to={`${base}/knowledge`} className="btn-primary mt-7">
              {t('bridge.cta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* KB pillars */}
      <section className="container-page pb-20 sm:pb-24">
        <SectionHead eyebrow={t('kb.eyebrow')} heading={t('kb.heading')} />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Link
              key={pillar.title}
              to={`${base}/knowledge`}
              className="card group flex flex-col hover:-translate-y-0.5 hover:border-harbor/40 hover:shadow-lift"
            >
              <span className="self-start rounded-full bg-harbor/10 px-2.5 py-1 text-xs font-medium text-harbor-deep">
                {pillar.tag}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{pillar.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{pillar.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-harbor">
                {pillar.cta}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-surface/50">
        <div className="container-page grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow={t('faq.eyebrow')} heading={t('faq.heading')} />
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium">
                  {faq.q}
                  <span className="text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('cta.heading')}</h2>
          <p className="mt-4 text-muted">{t('cta.body')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary">
              <Download className="h-4 w-4" />
              {t('cta.primary')}
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost">
              <GithubIcon className="h-4 w-4" />
              {t('cta.secondary')}
            </a>
          </div>
          <p className="mt-5 font-mono text-xs text-muted">{t('cta.meta')}</p>
        </div>
      </section>
    </>
  )
}
