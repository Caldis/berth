import type { Lang } from '@/lib/langs'

export type Pillar = 'understand' | 'features' | 'guides'

export interface Source {
  /** Display title of the reference. */
  title: string
  url: string
  /** One-line credibility / context note (shown under the link). */
  note?: string
  /** Mark vendor self-claims so readers know it is not independently verified. */
  claim?: boolean
}

export interface ArticleBlock {
  type: 'p' | 'h2' | 'list' | 'callout'
  /** For 'p' / 'h2' / 'callout': the text. For 'list': ignored. */
  text?: string
  /** For 'list': bullet items. */
  items?: string[]
  /** For 'callout': a short label, e.g. an analogy or key idea. */
  label?: string
}

export interface Article {
  slug: string
  pillar: Pillar
  lang: Lang
  /** Ordering within its pillar. */
  order: number
  title: string
  /** Short summary, used in cards, meta description, and llms.txt. */
  summary: string
  /** Lead paragraph shown under the title. */
  lead: string
  body: ArticleBlock[]
  sources: Source[]
}

/** Localized labels for each pillar (for hubs and breadcrumbs). */
export interface PillarMeta {
  key: Pillar
  tag: string
  title: string
  body: string
}
