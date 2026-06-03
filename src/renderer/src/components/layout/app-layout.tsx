import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { SearchDialog } from './search-dialog'
import { InspectorDrawer } from './inspector-drawer'
import { SIDEBAR_COLLAPSED_WIDTH, useAppStore } from '@/stores/app'
import { isWindowsPlatform } from '@/lib/platform'
import { WindowControls } from './window-controls'
import { useAssets } from '@/hooks/use-ipc'
import { TopNavigation } from './top-navigation'
import { PageChromeProvider } from './page-chrome'

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const location = useLocation()
  const isWindows = isWindowsPlatform()
  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth
  const isOverviewRoute = location.pathname === '/'
  const [topNavigationHeight, setTopNavigationHeight] = useState(72)
  const contentTopOffset = isOverviewRoute ? 24 : topNavigationHeight + 20
  const scrollRegionStyle = useMemo<CSSProperties>(
    () => ({ scrollPaddingTop: contentTopOffset }),
    [contentTopOffset]
  )
  const contentStyle = useMemo<CSSProperties>(
    () => ({ paddingTop: contentTopOffset }),
    [contentTopOffset]
  )
  useAssets()

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <Sidebar />
      <PageChromeProvider>
        <div
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200"
          style={{ marginLeft: effectiveSidebarWidth }}
        >
          <TopNavigation isWindows={isWindows} onHeightChange={setTopNavigationHeight} />
          <main
            data-testid="app-content-scroll"
            className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
            style={scrollRegionStyle}
          >
            <div className="px-6 pb-6" style={contentStyle}>
              {children}
            </div>
          </main>
        </div>
        {isWindows && <WindowControls />}
        <SearchDialog />
        <InspectorDrawer />
      </PageChromeProvider>
    </div>
  )
}
