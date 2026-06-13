import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Seo } from '@/components/Seo'
import { useLang } from '@/lib/useLang'

export function NotFound() {
  const { t } = useTranslation()
  const lang = useLang()

  return (
    <>
      <Seo lang={lang} path="/404" title={t('notFound.metaTitle')} description={t('notFound.metaDescription')} />
      <section className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white">
            B
          </div>
          <span className="eyebrow mt-6 block">{t('notFound.eyebrow')}</span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{t('notFound.title')}</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">{t('notFound.body')}</p>
          <Link to={`/${lang}`} className="btn-primary mt-6">
            {t('notFound.cta')}
          </Link>
        </div>
      </section>
    </>
  )
}
