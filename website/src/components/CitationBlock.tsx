import { ExternalLink } from 'lucide-react'
import type { Source } from '@/content/types'

interface CitationBlockProps {
  sources: Source[]
  title: string
  claimLabel: string
}

export function CitationBlock({ sources, title, claimLabel }: CitationBlockProps) {
  if (!sources.length) return null
  return (
    <section className="mt-14 rounded-3xl border border-line bg-cream p-7">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ol className="mt-4 space-y-4">
        {sources.map((s, i) => (
          <li key={s.url} className="flex gap-3 text-sm">
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                {s.title}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
                {s.claim && (
                  <span className="ml-1 rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-semibold text-amber">
                    {claimLabel}
                  </span>
                )}
              </a>
              {s.note && <p className="mt-1 text-xs leading-relaxed text-muted">{s.note}</p>}
              <p className="mt-0.5 break-all font-mono text-[10px] text-muted/70">{s.url}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
