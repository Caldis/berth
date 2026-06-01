import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { JsonLd } from '@/components/JsonLd'
import { ArticleView } from '@/components/ArticleView'
import { getArticle, getArticles, PILLAR_ORDER } from '@/content'
import type { Pillar } from '@/content/types'
import type { Lang } from '@/lib/langs'
import { SITE_URL } from '@/lib/site'
import { articleLd, breadcrumbLd } from '@/lib/schema'

const UI: Record<Lang, { sources: string; claim: string; prev: string; next: string; back: string }> = {
  zh: { sources: '参考来源', claim: '厂商声明', prev: '上一篇', next: '下一篇', back: '知识库' },
  en: { sources: 'Sources', claim: 'vendor claim', prev: 'Previous', next: 'Next', back: 'Knowledge' },
  ja: { sources: '参考文献', claim: 'ベンダー声明', prev: '前へ', next: '次へ', back: 'ナレッジ' },
  ko: { sources: '출처', claim: '벤더 주장', prev: '이전', next: '다음', back: '지식베이스' },
}

export function Article({ lang, pillar, slug }: { lang: Lang; pillar: Pillar; slug: string }) {
  const { t } = useTranslation()
  const ui = UI[lang]
  const base = `/${lang}`
  const article = getArticle(lang, pillar, slug)
  const pillarsMeta = t('kb.pillars', { returnObjects: true }) as { tag: string; title: string }[]
  const pillarMeta = pillarsMeta[PILLAR_ORDER.indexOf(pillar)]

  if (!article) {
    return (
      <section className="container-page py-20 text-center">
        <p className="text-muted">Not found.</p>
        <Link to={`${base}/knowledge`} className="btn-ghost mt-6">
          {ui.back}
        </Link>
      </section>
    )
  }

  const siblings = getArticles(lang, pillar)
  const idx = siblings.findIndex((a) => a.slug === slug)
  const prev = idx > 0 ? siblings[idx - 1] : undefined
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : undefined

  return (
    <>
      <Seo
        lang={lang}
        path={`/knowledge/${pillar}/${slug}`}
        title={`${article.title} — Berth`}
        description={article.summary}
      />
      <JsonLd
        data={articleLd({
          lang,
          title: article.title,
          description: article.summary,
          url: `${SITE_URL}/${lang}/knowledge/${pillar}/${slug}`,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: t('nav.knowledge'), url: `${SITE_URL}/${lang}/knowledge` },
          { name: pillarMeta?.title ?? pillar, url: `${SITE_URL}/${lang}/knowledge` },
          { name: article.title, url: `${SITE_URL}/${lang}/knowledge/${pillar}/${slug}` },
        ])}
      />
      <article className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Link to={`${base}/knowledge`} className="hover:text-ink">
              {t('nav.knowledge')}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>{pillarMeta?.tag}</span>
          </nav>

          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-[2.75rem]">
            {article.title}
          </h1>

          <ArticleView article={article} sourcesLabel={ui.sources} claimLabel={ui.claim} />

          <nav className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-8">
            {prev ? (
              <Link to={`${base}/knowledge/${prev.pillar}/${prev.slug}`} className="group inline-flex max-w-[45%] items-center gap-2 text-sm text-muted hover:text-ink">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`${base}/knowledge/${next.pillar}/${next.slug}`} className="group inline-flex max-w-[45%] items-center justify-end gap-2 text-right text-sm text-muted hover:text-ink">
                <span className="truncate">{next.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </article>
    </>
  )
}
