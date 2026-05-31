import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GithubIcon } from './GithubIcon'
import { useLang } from '@/lib/useLang'
import { GITHUB_URL } from '@/lib/site'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Footer() {
  const { t } = useTranslation()
  const lang = useLang()
  const base = `/${lang}`

  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr_auto]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-ink font-display text-sm font-bold text-paper">
              B
            </span>
            <span className="font-display text-lg font-semibold">Berth</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
        </div>

        <nav>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('footer.productTitle')}</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to={`${base}/features`} className="text-muted transition-colors hover:text-ink">
                {t('footer.featuresLink')}
              </Link>
            </li>
            <li>
              <Link to={`${base}/knowledge`} className="text-muted transition-colors hover:text-ink">
                {t('footer.knowledgeLink')}
              </Link>
            </li>
            <li>
              <Link to={`${base}/changelog`} className="text-muted transition-colors hover:text-ink">
                {t('footer.changelogLink')}
              </Link>
            </li>
          </ul>
        </nav>

        <nav>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t('footer.resourcesTitle')}</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
              >
                <GithubIcon className="h-3.5 w-3.5" />
                {t('footer.githubLink')}
              </a>
            </li>
            <li>
              <Link to={`${base}/about`} className="text-muted transition-colors hover:text-ink">
                {t('footer.aboutLink')}
              </Link>
            </li>
            <li>
              <Link to={`${base}/privacy`} className="text-muted transition-colors hover:text-ink">
                {t('footer.privacyLink')}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-start md:justify-end">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.madeBy')}</span>
        </div>
      </div>
    </footer>
  )
}
