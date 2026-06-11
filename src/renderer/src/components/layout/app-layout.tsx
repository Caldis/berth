import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './sidebar'
import { SearchDialog } from './search-dialog'
import { InspectorDrawer } from './inspector-drawer'
import { SIDEBAR_COLLAPSED_WIDTH, useAppStore } from '@/stores/app'
import { isWindowsPlatform } from '@/lib/platform'
import { WindowControls } from './window-controls'
import { useAssets } from '@/hooks/use-ipc'
import { TopNavigation } from './top-navigation'
import { PageChromeProvider } from './page-chrome'
import { IndexHairline } from '@/components/shared/index-activity'
import { ErrorState } from '@/components/shared/error-state'

type ContentScrollStyle = CSSProperties & {
  '--berth-page-scrollbar-gutter': string
}

export function AppLayout({ children }: { children: ReactNode }): React.ReactElement {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const isWindows = isWindowsPlatform()
  const effectiveSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth
  const scrollRegionRef = useRef<HTMLElement | null>(null)
  const [scrollbarGutter, setScrollbarGutter] = useState(0)
  const scrollRegionStyle = useMemo<ContentScrollStyle>(
    () => ({
      scrollPaddingTop: 'var(--berth-page-gutter)',
      '--berth-page-scrollbar-gutter': `${scrollbarGutter}px`
    }),
    [scrollbarGutter]
  )
  const contentStyle = useMemo<CSSProperties>(
    () => ({
      paddingBottom: 'var(--berth-page-gutter)',
      paddingLeft: 'var(--berth-page-gutter)',
      paddingRight: 'max(0px, calc(var(--berth-page-gutter) - var(--berth-page-scrollbar-gutter, 0px)))',
      paddingTop: 'var(--berth-page-gutter)'
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

  const { t } = useTranslation()
  // GH-118 T4: the runtime bootstrap failing silently used to leave the whole
  // app stuck on an empty idle screen — surface it. With no assets at all the
  // pages are meaningless, so the content area becomes a full error state
  // (sidebar stays navigable); with data present a compact banner is shown
  // instead and the pages keep rendering (SWR, no clear-screen).
  const { assets, error: runtimeError, retry } = useAssets()
  const runtimeErrorBlocking = runtimeError !== null && assets.length === 0

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <Sidebar />
      <PageChromeProvider>
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200"
          style={{ marginLeft: effectiveSidebarWidth }}
        >
          <div className="relative shrink-0">
            <TopNavigation isWindows={isWindows} />
            <IndexHairline />
          </div>
          <main
            ref={scrollRegionRef}
            data-testid="app-content-scroll"
            className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
            style={scrollRegionStyle}
          >
            <div style={contentStyle}>
              {runtimeErrorBlocking ? (
                <ErrorState
                  fullHeight
                  title={t('common.assetsErrorTitle')}
                  description={t('common.assetsErrorBody')}
                  onRetry={retry}
                />
              ) : (
                <>
                  {runtimeError !== null && (
                    <ErrorState
                      className="mb-4"
                      title={t('common.assetsErrorTitle')}
                      onRetry={retry}
                    />
                  )}
                  {children}
                </>
              )}
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
