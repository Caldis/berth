import { useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Search, Settings as SettingsIcon } from 'lucide-react'
import type { AgentView } from '@shared/types/asset'
import { cn } from '@/lib/utils'
import { SIDEBAR_COLLAPSED_WIDTH, useAppStore } from '@/stores/app'
import { navItemMatchesLocation, navSections } from './nav-config'
import { isMacPlatform } from '@/lib/platform'
import { SettingsDialog } from './settings-dialog'
import { ProjectScopeSwitcher } from './project-scope-switcher'

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)

  const isMac = isMacPlatform()
  const effectiveWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth

  const handleResizeMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (collapsed) return
      event.preventDefault()

      const startX = event.clientX
      const startWidth = sidebarWidth

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        setSidebarWidth(startWidth + moveEvent.clientX - startX)
      }

      const handleMouseUp = (): void => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [collapsed, setSidebarWidth, sidebarWidth]
  )

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200'
        )}
        style={{ width: effectiveWidth }}
        data-testid="app-sidebar"
      >
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('nav.resizeSidebar')}
            className={cn(
              'titlebar-no-drag absolute right-[-4px] top-0 h-full w-2 cursor-col-resize',
              'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent',
              'hover:before:bg-sidebar-accent/40'
            )}
            onMouseDown={handleResizeMouseDown}
          />
        )}
        {/* macOS reserves a draggable band for the traffic-light buttons (positioned
            at 16,16 in src/main/index.ts). Its height matches the main content's top
            drag strip (app-layout.tsx) so content begins on one line across the window,
            giving the logo below comfortable clearance from the buttons. */}
        {isMac && <div className="titlebar-drag h-9 w-full shrink-0" />}

        <div className="titlebar-drag flex h-14 shrink-0 items-center gap-2 px-4">
          <div className="titlebar-no-drag flex min-w-0 items-center gap-2">
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

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label={t('search.placeholder')}
            title={collapsed ? t('search.placeholder') : undefined}
            className={cn(
              'titlebar-no-drag flex h-9 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2.5 text-sm text-muted-foreground transition-colors hover:border-sidebar-accent/40 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              collapsed && 'justify-center px-0'
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left">{t('search.placeholder')}</span>
                <kbd className="rounded border border-sidebar-border bg-sidebar-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {isMac ? '⌘' : 'Ctrl+'}K
                </kbd>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {navSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-1">
              {section.labelKey && !collapsed && (
                <div className="mb-1 mt-3 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(section.labelKey)}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const active = navItemMatchesLocation(item, location.pathname, location.search)
                  const label = t(item.labelKey)
                  const description = item.descriptionKey ? t(item.descriptionKey) : ''
                  const title = description ? `${label} - ${description}` : label
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.path)}
                      aria-label={title}
                      className={cn(
                        'titlebar-no-drag flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        active
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground',
                        collapsed && 'justify-center px-0'
                      )}
                      title={collapsed ? title : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate leading-5">{label}</span>
                          {description && (
                            <span
                              className={cn(
                                'block truncate text-[11px] font-normal leading-4',
                                active ? 'text-accent-foreground/70' : 'text-muted-foreground'
                              )}
                            >
                              {description}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'flex-col')}>
            <AgentViewSwitcher collapsed={collapsed} />
            <ProjectScopeSwitcher collapsed={collapsed} />
            <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
              <button
                ref={settingsButtonRef}
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={cn(
                  'titlebar-no-drag flex h-8 items-center gap-2 rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground',
                  collapsed ? 'w-8 justify-center' : 'flex-1 justify-start px-2.5'
                )}
                title={collapsed ? t('nav.settings') : undefined}
                aria-label={t('nav.settings')}
              >
                <SettingsIcon className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{t('nav.settings')}</span>}
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                className="titlebar-no-drag flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
              >
                {collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        returnFocusRef={settingsButtonRef}
      />
    </>
  )
}

function AgentViewSwitcher({ collapsed }: { collapsed: boolean }): React.ReactElement | null {
  const { t } = useTranslation()
  const agentView = useAppStore((s) => s.agentView)
  const setAgentView = useAppStore((s) => s.setAgentView)
  const options: AgentView[] = ['all', 'claude', 'codex']

  if (collapsed) return null

  return (
    <div className="titlebar-no-drag rounded-md border border-sidebar-border bg-sidebar p-1.5">
      <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('agentView.label')}
      </div>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('agentView.label')}>
        {options.map((option) => {
          const active = agentView === option
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setAgentView(option)}
              className={cn(
                'h-7 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/10 hover:text-sidebar-foreground'
              )}
            >
              {t(`agentView.${option}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
