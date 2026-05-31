import type { Lang } from '@/lib/langs'
import type { Article, Pillar } from './types'
import { understandEn } from './understand.en'
import { understandZh } from './understand.zh'
import { featuresEn } from './features.en'
import { featuresZh } from './features.zh'
import { guidesEn } from './guides.en'
import { guidesZh } from './guides.zh'

export const PILLAR_ORDER: Pillar[] = ['understand', 'features', 'guides']

const ALL: Article[] = [
  ...understandEn,
  ...understandZh,
  ...featuresEn,
  ...featuresZh,
  ...guidesEn,
  ...guidesZh,
]

export function getArticles(lang: Lang, pillar?: Pillar): Article[] {
  return ALL.filter((a) => a.lang === lang && (!pillar || a.pillar === pillar)).sort(
    (a, b) => a.order - b.order,
  )
}

export function getArticle(lang: Lang, pillar: Pillar, slug: string): Article | undefined {
  return ALL.find((a) => a.lang === lang && a.pillar === pillar && a.slug === slug)
}
