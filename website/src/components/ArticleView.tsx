import type { Article, ArticleBlock } from '@/content/types'
import { CitationBlock } from './CitationBlock'

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">{block.text}</h2>
    case 'list':
      return (
        <ul className="mt-4 space-y-2">
          {(block.items ?? []).map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'callout':
      return (
        <aside className="mt-8 rounded-3xl border border-line bg-cream p-6">
          {block.label && (
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">{block.label}</div>
          )}
          <p className="mt-2 font-display text-lg leading-relaxed text-ink">{block.text}</p>
        </aside>
      )
    default:
      return <p className="mt-4 leading-relaxed text-muted">{block.text}</p>
  }
}

export function ArticleView({
  article,
  sourcesLabel,
  claimLabel,
}: {
  article: Article
  sourcesLabel: string
  claimLabel: string
}) {
  return (
    <div>
      <p className="mt-5 text-lg leading-relaxed text-ink/80">{article.lead}</p>
      {article.body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
      <CitationBlock sources={article.sources} title={sourcesLabel} claimLabel={claimLabel} />
    </div>
  )
}
