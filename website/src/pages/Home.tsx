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
    <div className="mx-auto max-w-2xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{heading}</h2>
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

      {/* Hero — centered, handhold-style */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[640px]"
          style={{ background: 'radial-gradient(58% 60% at 50% 0%, rgb(var(--harbor) / 0.12), transparent 70%)' }}
          aria-hidden
        />
        <div className="container-page relative py-20 text-center lg:py-28">
          <span className="eyebrow animate-fade-up">{t('hero.badge')}</span>
          <h1
            className="mx-auto mt-7 max-w-4xl font-display text-[2.6rem] font-extrabold leading-[1.06] tracking-tight animate-fade-up sm:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            {t('hero.title')} <span className="text-harbor">{t('hero.titleAccent')}</span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted animate-fade-up"
            style={{ animationDelay: '120ms' }}
          >
            {t('hero.subtitle')}
          </p>
          <div
            className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-fade-up"
            style={{ animationDelay: '180ms' }}
          >
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

          {/* proof row */}
          <div
            className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 animate-fade-up"
            style={{ animationDelay: '300ms' }}
          >
            {trust.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-sm text-muted">
                <Check className="h-4 w-4 shrink-0 text-harbor" />
                {item}
              </span>
            ))}
          </div>

          {/* product visual below hero */}
          <div className="mx-auto mt-16 max-w-4xl animate-fade-up" style={{ animationDelay: '260ms' }}>
            <AssetPanel />
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="container-page py-20 sm:py-24">
        <SectionHead eyebrow={t('value.eyebrow')} heading={t('value.heading')} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {values.map((item, i) => {
            const Icon = valueIcons[i] ?? Layers
            return (
              <div key={item.title} className="card">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-harbor-soft text-harbor-deep">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-surface/60">
        <div className="container-page py-20 sm:py-24">
          <SectionHead eyebrow={t('features.eyebrow')} heading={t('features.heading')} />
          <div className="mt-16 space-y-16">
            {features.map((feature, i) => {
              const Icon = featureIcons[i] ?? LayoutGrid
              const reverse = i % 2 === 1
              return (
                <div key={feature.name} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                  <div className={reverse ? 'lg:order-2' : ''}>
                    <span className="inline-flex items-center gap-2 rounded-full bg-harbor-soft px-3 py-1 font-mono text-xs font-semibold text-harbor-deep">
                      <Icon className="h-3.5 w-3.5" />
                      {feature.name}
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight">{feature.title}</h3>
                    <p className="mt-3 max-w-md leading-relaxed text-muted">{feature.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {feature.points.map((p) => (
                        <li key={p} className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={reverse ? 'lg:order-1' : ''}>
                    <div className="rounded-3xl border border-line bg-paper/60 p-8 shadow-soft">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-harbor text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="mt-6 space-y-2.5">
                        {feature.points.map((p, k) => (
                          <div key={p} className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-muted">{String(k + 1).padStart(2, '0')}</span>
                            <div className="h-9 flex-1 rounded-xl border border-line bg-surface px-3 text-sm leading-9 text-ink">
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
        <div className="relative overflow-hidden rounded-3xl bg-harbor px-8 py-16 text-center text-white shadow-lift sm:px-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: 'radial-gradient(50% 80% at 80% 0%, rgb(var(--amber) / 0.6), transparent)' }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold">
              {t('bridge.eyebrow')}
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t('bridge.heading')}</h2>
            <p className="mt-4 leading-relaxed text-white/85">{t('bridge.body')}</p>
            <Link
              to={`${base}/knowledge`}
              className="btn mt-8 bg-white text-harbor-deep shadow-soft hover:bg-white/90"
            >
              {t('bridge.cta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* KB pillars */}
      <section className="container-page pb-20 sm:pb-24">
        <SectionHead eyebrow={t('kb.eyebrow')} heading={t('kb.heading')} />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <Link
              key={pillar.title}
              to={`${base}/knowledge`}
              className="card group flex flex-col hover:-translate-y-1 hover:border-harbor/40 hover:shadow-lift"
            >
              <span className="self-start rounded-full bg-harbor-soft px-3 py-1 text-xs font-semibold text-harbor-deep">
                {pillar.tag}
              </span>
              <h3 className="mt-4 font-display text-xl font-bold">{pillar.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{pillar.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-harbor">
                {pillar.cta}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-surface/60">
        <div className="container-page py-20 sm:py-24">
          <SectionHead eyebrow={t('faq.eyebrow')} heading={t('faq.heading')} />
          <div className="mx-auto mt-12 max-w-3xl divide-y divide-line">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                  {faq.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-harbor-soft text-harbor-deep transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t('cta.heading')}</h2>
          <p className="mt-4 text-muted">{t('cta.body')}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
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
