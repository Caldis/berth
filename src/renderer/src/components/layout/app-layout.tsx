import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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

type ContentScrollStyle = CSSProperties & {
  '--berth-page-scrollbar-gutter': string
  '--berth-page-top-offset': string
}

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const location = useLocation()
  const isWindows = isWindowsPlatform()
  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth
  const isOverviewRoute = location.pathname === '/'
  const scrollRegionRef = useRef<HTMLElement | null>(null)
  const [topNavigationHeight, setTopNavigationHeight] = useState(72)
  const [scrollbarGutter, setScrollbarGutter] = useState(0)
  const pageTopOffset = isOverviewRoute
    ? 'var(--berth-page-gutter)'
    : `calc(${topNavigationHeight}px + var(--berth-page-gutter))`
  const scrollRegionStyle = useMemo<ContentScrollStyle>(
    () => ({
      scrollPaddingTop: 'var(--berth-page-top-offset)',
      '--berth-page-scrollbar-gutter': `${scrollbarGutter}px`,
      '--berth-page-top-offset': pageTopOffset
    }),
    [pageTopOffset, scrollbarGutter]
  )
  const contentStyle = useMemo<CSSProperties>(
    () => ({
      paddingBottom: 'var(--berth-page-gutter)',
      paddingLeft: 'var(--berth-page-gutter)',
      paddingRight: 'max(0px, calc(var(--berth-page-gutter) - var(--berth-page-scrollbar-gutter, 0px)))',
      paddingTop: 'var(--berth-page-top-offset)'
    }),
    []
  )

  useLayoutEffect(() => {
    const element = scrollRegionRef.current
    if (!element) return undefined

    const publishScrollbarGutter = (): void => {
      const nextGutter = Math.max(0, element.offsetWidth - element.clientWidth)
      setScrollbarGutter((current) => current === nextGutter ? current : nextGutter)
    }

    publishScrollbarGutter()

    if (typeof ResizeObserver === 'undefined') return undefined
    const resizeObserver = new ResizeObserver(publishScrollbarGutter)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [])

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
            ref={scrollRegionRef}
            data-testid="app-content-scroll"
            className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
            style={scrollRegionStyle}
          >
            <div style={contentStyle}>
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
