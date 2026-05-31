import { Head } from 'vite-react-ssg'
import { SITE_URL } from '@/lib/site'
import { LANGS, HREFLANG, type Lang } from '@/lib/langs'

interface SeoProps {
  lang: Lang
  /** Path after the language segment, e.g. '' for home or '/knowledge'. */
  path: string
  title: string
  description: string
}

export function Seo({ lang, path, title, description }: SeoProps) {
  const url = `${SITE_URL}/${lang}${path}`
  return (
    <Head>
      <html lang={HREFLANG[lang]} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {LANGS.map((l) => (
        <link key={l} rel="alternate" hrefLang={HREFLANG[l]} href={`${SITE_URL}/${l}${path}`} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/en${path}`} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Berth" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}/og/cover.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
}
