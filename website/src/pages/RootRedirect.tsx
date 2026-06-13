import { useEffect } from 'react'
import { Head } from 'vite-react-ssg'
import { DEFAULT_LANG, HREFLANG, LANGS, isLang, type Lang } from '@/lib/langs'
import { SITE_URL } from '@/lib/site'

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem('berth-lang')
    if (isLang(stored ?? undefined)) return stored as Lang
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || '').toLowerCase()
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('ja')) return 'ja'
  if (nav.startsWith('ko')) return 'ko'
  return DEFAULT_LANG
}

export function RootRedirect() {
  useEffect(() => {
    if (window.location.pathname === '/') {
      window.location.replace(`/${detectLang()}`)
    }
  }, [])

  return (
    <>
      <Head>
        <title>Berth — Local AI Agent Asset Manager</title>
        <meta name="robots" content="noindex" />
        {LANGS.map((l) => (
          <link key={l} rel="alternate" hrefLang={HREFLANG[l]} href={`${SITE_URL}/${l}`} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/en`} />
      </Head>
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white">
            B
          </div>
          <p className="mt-4 text-sm text-muted">Redirecting…</p>
          <noscript>
            <ul className="mt-4 flex justify-center gap-4">
              {LANGS.map((l) => (
                <li key={l}>
                  <a className="text-harbor underline" href={`/${l}`}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </noscript>
        </div>
      </div>
    </>
  )
}
