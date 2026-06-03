import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, HelpCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { findNavMatch } from './nav-config'
import { useAppStore } from '@/stores/app'
import { isMacPlatform } from '@/lib/platform'
import { FeatureGuidePanel } from '@/components/shared/feature-guide-panel'
import { useCurrentPageChrome } from './page-chrome'

type BreadcrumbItem = {
  key: string
  label: React.ReactNode
}

interface RouteChrome {
  sectionLabelKey?: string
  titleLabelKey?: string
}

function routeChrome(pathname: string, search = ''): RouteChrome | null {
  if (pathname === '/') return null

  if (/^\/sessions\/[^/]+/.test(pathname)) {
    return { titleLabelKey: 'nav.sessionDetail' }
  }

  const match = findNavMatch(pathname, search)
  if (match) {
    return {
      sectionLabelKey: match.section.labelKey,
      titleLabelKey: match.item.labelKey
    }
  }

  return null
}

export function TopNavigation({ isWindows }: { isWindows: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const pageChrome = useCurrentPageChrome()
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)
  const [guideOpen, setGuideOpen] = useState(false)
  const route = useMemo(
    () => routeChrome(location.pathname, location.search),
    [location.pathname, location.search]
  )
  const isMac = isMacPlatform()
  const title = pageChrome.title ?? (route?.titleLabelKey ? t(route.titleLabelKey) : undefined)
  const sectionLabel = pageChrome.parentLabel ??
    (pageChrome.sectionLabelKey ? t(pageChrome.sectionLabelKey) : route?.sectionLabelKey ? t(route.sectionLabelKey) : undefined)
  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = []
    if (sectionLabel) items.push({ key: 'section', label: sectionLabel })
    if (title) items.push({ key: 'title', label: title })
    return items
  }, [sectionLabel, title])

  if (!route && !title && !pageChrome.leading && !pageChrome.actions && !pageChrome.guide) {
    return <></>
  }

  return (
    <header
      className={cn(
        'titlebar-drag relative flex min-h-[72px] shrink-0 items-center border-b border-border bg-background/95 px-6 py-3 shadow-[0_1px_0_hsl(var(--border))]',
        isWindows && 'pr-44'
      )}
      data-testid="top-navigation"
    >
      <div className="grid w-full min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {pageChrome.leading && (
            <div className="titlebar-no-drag shrink-0">
              {pageChrome.leading}
            </div>
          )}
          <div className="min-w-0">
            {breadcrumbs.length > 0 && (
              <nav
                className="titlebar-no-drag flex min-w-0 items-center gap-1 text-xs"
                aria-label={t('nav.breadcrumb')}
              >
                {breadcrumbs.map((item, index) => (
                  <span key={`${item.key}-${index}`} className="flex min-w-0 items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span
                      className={cn(
                        'truncate',
                        index === breadcrumbs.length - 1
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                ))}
              </nav>
            )}
            {title && (
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {pageChrome.subtitle && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{pageChrome.subtitle}</p>
            )}
          </div>
        </div>

        <div className="titlebar-no-drag flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {pageChrome.actions}
          {pageChrome.guide && (
            <div className="relative">
              <button
                type="button"
                aria-expanded={guideOpen}
                aria-label={t('nav.pageGuide')}
                onClick={() => setGuideOpen((value) => !value)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.pageGuide')}</span>
              </button>
              {guideOpen && (
                <div className="absolute right-0 top-11 z-40 w-[min(42rem,calc(100vw-3rem))]">
                  <FeatureGuidePanel
                    guide={pageChrome.guide.definition}
                    evidence={pageChrome.guide.evidence}
                    agentView={pageChrome.guide.agentView}
                    className="shadow-[0_18px_45px_-20px_hsl(var(--foreground)/0.35)]"
                  />
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            aria-label={t('search.placeholder')}
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden max-w-[10rem] truncate sm:inline">{t('search.placeholder')}</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        </div>
      </div>
    </header>
  )
}
