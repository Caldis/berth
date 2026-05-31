import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

export function Privacy() {
  const { t } = useTranslation()
  const lang = useLang()

  return (
    <>
      <Seo lang={lang} path="/privacy" title={t('meta.privacy.title')} description={t('meta.privacy.description')} />
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-3xl">
          <span className="eyebrow">{t('footer.privacyLink')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t('meta.privacy.title')}</h1>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-muted">
            <p>{t('pages.privacy.body1')}</p>
            <p>{t('pages.privacy.body2')}</p>
          </div>
        </div>
      </section>
    </>
  )
}
