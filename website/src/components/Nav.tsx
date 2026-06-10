import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Menu, X } from 'lucide-react'
import { GithubIcon } from './GithubIcon'
import { useLang } from '@/lib/useLang'
import { GITHUB_URL, RELEASES_URL } from '@/lib/site'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

function Wordmark({ to }: { to: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <img src="/icon.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-xl" />
      <span className="font-display text-lg font-semibold tracking-tight">Berth</span>
    </Link>
  )
}

export function Nav() {
  const { t } = useTranslation()
  const lang = useLang()
  const base = `/${lang}`
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Wordmark to={base} />

        <div className="hidden items-center gap-7 md:flex">
          <Link to={`${base}/features`} className="text-sm text-muted transition-colors hover:text-ink">
            {t('nav.features')}
          </Link>
          <Link to={`${base}/knowledge`} className="text-sm text-muted transition-colors hover:text-ink">
            {t('nav.knowledge')}
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <GithubIcon className="h-4 w-4" />
            GitHub
          </a>
          <span className="h-5 w-px bg-line" />
          <LanguageSwitcher />
          <ThemeToggle />
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary">
            <Download className="h-4 w-4" />
            {t('nav.download')}
          </a>
        </div>

        <button
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-paper md:hidden">
          <div className="container-page flex flex-col gap-4 py-5">
            <Link to={`${base}/features`} onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
              {t('nav.features')}
            </Link>
            <Link to={`${base}/knowledge`} onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink">
              {t('nav.knowledge')}
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
            <div className="flex items-center justify-between border-t border-line pt-4">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary w-full">
              <Download className="h-4 w-4" />
              {t('nav.download')}
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
