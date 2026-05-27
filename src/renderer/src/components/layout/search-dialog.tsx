import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Plug,
  MessageSquare,
  BarChart3,
  Settings,
  Search
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  group: string
}

const quickActions: QuickAction[] = [
  { id: 'overview', label: 'Overview', icon: Search, path: '/', group: 'Pages' },
  { id: 'sessions', label: 'Sessions', icon: MessageSquare, path: '/sessions', group: 'Pages' },
  {
    id: 'instructions',
    label: 'Instructions',
    icon: FileText,
    path: '/configuration/instructions',
    group: 'Pages'
  },
  {
    id: 'capabilities',
    label: 'Capabilities',
    icon: Plug,
    path: '/configuration/capabilities',
    group: 'Pages'
  },
  { id: 'usage', label: 'Usage', icon: BarChart3, path: '/usage', group: 'Pages' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', group: 'Pages' }
]

export function SearchDialog(): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const open = useAppStore((s) => s.searchOpen)
  const setOpen = useAppStore((s) => s.setSearchOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  const handleSelect = (path: string): void => {
    navigate(path)
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
        <div className="flex items-center border-b border-border px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            placeholder={t('search.placeholder')}
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t('search.hint')}
          </div>
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSelect(action.path)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm',
                'text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <action.icon className="h-4 w-4 text-muted-foreground" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
