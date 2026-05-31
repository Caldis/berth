import { useTranslation } from 'react-i18next'
import { GithubIcon } from '@/components/GithubIcon'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'
import { GITHUB_URL } from '@/lib/site'

export function About() {
  const { t } = useTranslation()
  const lang = useLang()

  return (
    <>
      <Seo lang={lang} path="/about" title={t('meta.about.title')} description={t('meta.about.description')} />
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{t('footer.aboutLink')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">Berth</h1>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-muted">
            <p>{t('pages.about.body1')}</p>
            <p>{t('pages.about.body2')}</p>
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
