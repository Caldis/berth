import { useTranslation } from 'react-i18next'
import { GithubIcon } from '@/components/GithubIcon'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'
import { GITHUB_URL } from '@/lib/site'

interface PageSection {
  title: string
  body: string
  items: string[]
}

interface AboutCopy {
  intro: string
  sections: PageSection[]
}

export function About() {
  const { t } = useTranslation()
  const lang = useLang()
  const about = t('pages.about', { returnObjects: true }) as AboutCopy

  return (
    <>
      <Seo lang={lang} path="/about" title={t('meta.about.title')} description={t('meta.about.description')} />
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{t('footer.aboutLink')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Berth</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{about.intro}</p>
          <div className="mt-10 space-y-8">
            {about.sections.map((section) => (
              <article key={section.title} className="border-t border-line pt-6">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{section.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-muted">{section.body}</p>
                <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-xl bg-surface px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-ghost mt-8">
            <GithubIcon className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </section>
    </>
  )
}
