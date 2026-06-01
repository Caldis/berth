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

/** BreadcrumbList for a knowledge-base article: Knowledge › Pillar › Article. */
export function breadcrumbLd(crumbs: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  }
}

/** CollectionPage + ItemList for the knowledge hub. */
export function collectionLd(opts: {
  lang: Lang
  name: string
  description: string
  url: string
  items: { name: string; url: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: HREFLANG[opts.lang],
    isPartOf: { '@type': 'WebSite', name: 'Berth', url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: it.url,
      })),
    },
  }
}
