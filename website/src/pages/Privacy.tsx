import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

interface PrivacySection {
  title: string
  body: string
  items: string[]
}

interface PrivacyCopy {
  intro: string
  sections: PrivacySection[]
}

export function Privacy() {
  const { t } = useTranslation()
  const lang = useLang()
  const privacy = t('pages.privacy', { returnObjects: true }) as PrivacyCopy

  return (
    <>
      <Seo lang={lang} path="/privacy" title={t('meta.privacy.title')} description={t('meta.privacy.description')} />
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{t('footer.privacyLink')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t('meta.privacy.title')}</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">{privacy.intro}</p>
          <div className="mt-10 space-y-8">
            {privacy.sections.map((section) => (
              <article key={section.title} className="border-t border-line pt-6">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{section.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-muted">{section.body}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-xl bg-surface px-4 py-3">
                      {item}
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
