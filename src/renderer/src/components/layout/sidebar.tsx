import { useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Search, Settings as SettingsIcon } from 'lucide-react'
import type { AgentView } from '@shared/types/asset'
import { cn } from '@/lib/utils'
import { SIDEBAR_COLLAPSED_WIDTH, useAppStore } from '@/stores/app'
import { navSections } from './nav-config'
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
  const agentView = useAppStore((s) => s.agentView)
  const setAgentView = useAppStore((s) => s.setAgentView)

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

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

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
          {!collapsed && (
            <select
              value={agentView}
              onChange={(event) => setAgentView(event.target.value as AgentView)}
              className="titlebar-no-drag ml-auto h-7 rounded-md border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground outline-none ring-ring transition-colors hover:bg-sidebar-accent/10 focus:ring-1"
              aria-label={t('agentView.label')}
            >
              <option value="all">{t('agentView.all')}</option>
              <option value="claude">{t('agentView.claude')}</option>
              <option value="codex">{t('agentView.codex')}</option>
            </select>
          )}
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
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
                  const active = isActive(item.path)
                  return (
                    <button
                      key={item.id}
                      type="button"
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
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'flex-col')}>
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
