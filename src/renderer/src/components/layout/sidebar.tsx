import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/components/theme-provider'
import { navSections } from './nav-config'

export function Sidebar(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)

  const isMac = navigator.platform.includes('Mac')

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const cycleTheme = (): void => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const toggleLanguage = (): void => {
    const next = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('berth-language', next)
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* macOS reserves a draggable band for the traffic-light buttons (positioned
          at 16,16 in src/main/index.ts). Its height matches the main content's top
          drag strip (app-layout.tsx) so content begins on one line across the window,
          giving the logo below comfortable clearance from the buttons. */}
      {isMac && <div className="titlebar-drag h-9 w-full shrink-0" />}

      {/* Titlebar drag area + logo */}
      <div className="titlebar-drag flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="titlebar-no-drag flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            B
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground">
              {t('app.name')}
            </span>
          )}
        </div>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'titlebar-no-drag flex w-full items-center gap-2 rounded-md border border-sidebar-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{t('search.placeholder')}</span>
              <kbd className="rounded border border-sidebar-border px-1 py-0.5 text-[10px] font-medium">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="mb-1">
            {section.labelKey && !collapsed && (
              <div className="mb-1 mt-3 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(section.labelKey)}
              </div>
            )}
            {section.items.map((item) => {
              const active = isActive(item.path)
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'titlebar-no-drag flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{t(item.labelKey)}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          <button
            onClick={cycleTheme}
            className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
            title={t(`settings.theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`)}
          >
            <ThemeIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleLanguage}
            className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
            title={i18n.language === 'en' ? '中文' : 'English'}
          >
            <Globe className="h-3.5 w-3.5" />
          </button>
          {!collapsed && <div className="flex-1" />}
          <button
            onClick={toggleSidebar}
            className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
