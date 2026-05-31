import { SITE_URL, GITHUB_URL } from './site'
import { HREFLANG, type Lang } from './langs'

const ORG = {
  '@type': 'Organization',
  name: 'Berth',
  url: SITE_URL,
  sameAs: [GITHUB_URL],
}

export function softwareApplicationLd(lang: Lang, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url: `${SITE_URL}/${lang}`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Windows',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    license: 'https://opensource.org/licenses/MIT',
    codeRepository: GITHUB_URL,
    author: ORG,
    inLanguage: HREFLANG[lang],
  }
}

export function articleLd(opts: {
  lang: Lang
  title: string
  description: string
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    inLanguage: HREFLANG[opts.lang],
    publisher: ORG,
    isAccessibleForFree: true,
  }
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }
}
