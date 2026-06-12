import { useCallback, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { findNavMatch } from './nav-config'
import { isMacPlatform } from '@/lib/platform'
import { FeatureGuidePanel } from '@/components/shared/feature-guide-panel'
import { FloatingPopover } from '@/components/shared/floating-popover'
import { IndexingInline } from '@/components/shared/index-activity'
import { useCurrentPageChrome, useRegisterPageSearchFocus } from './page-chrome'
import { ChromeSearchInput, searchShortcutLabel } from './search-control'

type BreadcrumbItem = {
  key: string
  label: React.ReactNode
}

interface RouteChrome {
  sectionLabelKey?: string
  titleLabelKey?: string
}

function routeChrome(pathname: string, search = ''): RouteChrome | null {
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

interface TopNavigationProps {
  isWindows: boolean
}

export function TopNavigation({ isWindows }: TopNavigationProps): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const pageChrome = useCurrentPageChrome()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const route = useMemo(
    () => routeChrome(location.pathname, location.search),
    [location.pathname, location.search]
  )
  const isMac = isMacPlatform()
  const title = pageChrome.title ?? (route?.titleLabelKey ? t(route.titleLabelKey) : undefined)
  const sectionLabel = pageChrome.parentLabel ??
    (pageChrome.sectionLabelKey ? t(pageChrome.sectionLabelKey) : route?.sectionLabelKey ? t(route.sectionLabelKey) : undefined)
  const isVisible = Boolean(route || title || pageChrome.leading || pageChrome.actions || pageChrome.guide || pageChrome.search)
  const usesNestedBreadcrumb = Boolean(pageChrome.parentLabel && title)
  const breadcrumbs = useMemo(() => {
    const items: BreadcrumbItem[] = []
    if (sectionLabel) items.push({ key: 'section', label: sectionLabel })
    if (usesNestedBreadcrumb && title) items.push({ key: 'title', label: title })
    return items
  }, [sectionLabel, title, usesNestedBreadcrumb])
  const focusPageSearch = useCallback(() => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [])
  useRegisterPageSearchFocus(pageChrome.search ? focusPageSearch : null, [pageChrome.search, focusPageSearch])

  return (
    <header
      className={cn(
        'titlebar-drag flex h-[72px] min-h-[72px] max-h-[72px] shrink-0 items-center overflow-hidden border-b border-border bg-background px-[var(--berth-page-gutter)] py-3 transition-opacity duration-200 ease-out motion-reduce:transition-none',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        isWindows && 'pr-52'
      )}
      data-testid="top-navigation"
      data-state={isVisible ? 'visible' : 'hidden'}
      aria-hidden={!isVisible}
    >
      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {pageChrome.leading && (
            <div className="titlebar-no-drag shrink-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-200">
              {pageChrome.leading}
            </div>
          )}
          <div className="min-w-0">
            {breadcrumbs.length > 0 && (
              <nav
                className={cn(
                  'titlebar-no-drag flex min-w-0 items-center gap-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150',
                  usesNestedBreadcrumb ? 'text-sm' : 'text-xs'
                )}
                aria-label={t('nav.breadcrumb')}
              >
                {breadcrumbs.map((item, index) => (
                  <span key={`${item.key}-${index}`} className="flex min-w-0 items-center gap-1">
                    {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span
                      className={cn(
                        'truncate font-medium',
                        usesNestedBreadcrumb && index === breadcrumbs.length - 1
                          ? 'text-xl font-semibold tracking-tight text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                ))}
              </nav>
            )}
            {title && usesNestedBreadcrumb && <h1 className="sr-only">{title}</h1>}
            {title && !usesNestedBreadcrumb && (
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {pageChrome.subtitle && !usesNestedBreadcrumb && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{pageChrome.subtitle}</p>
            )}
          </div>
        </div>

        <div
          key={`${location.pathname}${location.search}-chrome-actions`}
          data-testid="top-navigation-actions"
          className="titlebar-no-drag ml-auto flex min-w-0 max-w-[min(52rem,62%)] shrink-0 items-center justify-end gap-2 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-150"
        >
          <IndexingInline className="mr-0.5" />
          {pageChrome.actions}
          {pageChrome.search && (
            <ChromeSearchInput
              ref={searchInputRef}
              ariaLabel={pageChrome.search.ariaLabel ?? pageChrome.search.placeholder}
              value={pageChrome.search.value}
              onValueChange={pageChrome.search.onValueChange}
              placeholder={pageChrome.search.placeholder}
              shortcutLabel={searchShortcutLabel(isMac)}
            />
          )}
          {pageChrome.guide && (
            <FloatingPopover
              triggerTestId="page-guide-hover-region"
              contentTestId="page-guide-panel"
              side="bottom"
              align="end"
              sideOffset={8}
              closeDelay={220}
              safePolygonBuffer={32}
              hoverBridge
              contentClassName="w-[min(42rem,calc(100vw-3rem))] rounded-lg bg-transparent p-0 shadow-none"
              trigger={(
                <button
                  type="button"
                  aria-label={t('nav.pageGuide')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
                >
                  <HelpCircle className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            >
              <FeatureGuidePanel
                guide={pageChrome.guide.definition}
                evidence={pageChrome.guide.evidence}
                className="shadow-[0_18px_45px_-20px_hsl(var(--foreground)/0.35)]"
              />
            </FloatingPopover>
          )}
        </div>
      </div>
    </header>
  )
}
