import { Activity, Bot, Boxes, LayoutGrid, MessagesSquare, Plug, Settings, Webhook } from 'lucide-react'
import { cn } from '@/lib/cn'

const sidebar = [
  { icon: LayoutGrid, label: 'Overview' },
  { icon: MessagesSquare, label: 'Sessions' },
  { icon: Settings, label: 'Configuration', active: true },
  { icon: Activity, label: 'Usage' },
]

const rows = [
  { icon: Boxes, name: 'code-review', kind: 'Skill', scope: 'user', tone: 'harbor' },
  { icon: Plug, name: 'github', kind: 'MCP', scope: 'project', tone: 'amber' },
  { icon: Webhook, name: 'PreToolUse', kind: 'Hook', scope: 'user', tone: 'harbor' },
  { icon: Bot, name: 'reviewer', kind: 'Subagent', scope: 'project', tone: 'amber' },
  { icon: Boxes, name: 'commit-helper', kind: 'Skill', scope: 'user', tone: 'harbor' },
]

/**
 * A stylized, non-interactive representation of Berth's Finder-style asset
 * browser. Drawn with markup (no screenshot) so it stays crisp at any size.
 */
export function AssetPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-2 font-mono text-xs text-muted">berth · ~/.claude</span>
      </div>

      <div className="grid grid-cols-[132px_1fr]">
        <aside className="border-r border-line bg-paper/60 p-2.5">
          {sidebar.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={cn(
                'mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs',
                active ? 'bg-harbor/12 font-medium text-harbor-deep' : 'text-muted',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
          ))}
        </aside>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted">Capabilities</span>
            <span className="font-mono text-[10px] text-muted">25 assets</span>
          </div>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li
                key={row.name}
                className="flex items-center gap-3 rounded-xl border border-line/80 bg-paper/40 px-3 py-2.5"
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                    row.tone === 'harbor' ? 'bg-harbor/12 text-harbor-deep' : 'bg-amber/15 text-amber',
                  )}
                >
                  <row.icon className="h-3.5 w-3.5" />
                </span>
                <span className="font-mono text-xs text-ink">{row.name}</span>
                <span className="ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">
                  {row.kind}
                </span>
                <span className="hidden rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
                  {row.scope}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
