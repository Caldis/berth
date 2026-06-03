import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, HelpCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { findNavMatch } from './nav-config'
import { isMacPlatform } from '@/lib/platform'
import { FeatureGuidePanel } from '@/components/shared/feature-guide-panel'
import { useCurrentPageChrome, useRegisterPageSearchFocus } from './page-chrome'

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

interface TopNavigationProps {
  isWindows: boolean
  onHeightChange?: (height: number) => void
}

export function TopNavigation({ isWindows, onHeightChange }: TopNavigationProps): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const pageChrome = useCurrentPageChrome()
  const [guideOpen, setGuideOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const guideCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  const clearGuideCloseTimer = useCallback(() => {
    if (!guideCloseTimerRef.current) return
    clearTimeout(guideCloseTimerRef.current)
    guideCloseTimerRef.current = null
  }, [])
  const openGuide = useCallback(() => {
    clearGuideCloseTimer()
    setGuideOpen(true)
  }, [clearGuideCloseTimer])
  const scheduleGuideClose = useCallback(() => {
    clearGuideCloseTimer()
    guideCloseTimerRef.current = setTimeout(() => {
      setGuideOpen(false)
      guideCloseTimerRef.current = null
    }, 180)
  }, [clearGuideCloseTimer])
  const handleGuideBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
      scheduleGuideClose()
    }
  }, [scheduleGuideClose])
  useRegisterPageSearchFocus(pageChrome.search ? focusPageSearch : null, [pageChrome.search, focusPageSearch])

  useEffect(() => clearGuideCloseTimer, [clearGuideCloseTimer])

  useLayoutEffect(() => {
    if (!onHeightChange) return undefined
    const element = headerRef.current
    if (!element) return undefined

    const publishHeight = (): void => {
      const measuredHeight = element.offsetHeight
      if (measuredHeight > 0) onHeightChange(measuredHeight)
    }

    publishHeight()

    if (typeof ResizeObserver === 'undefined') return undefined
    const resizeObserver = new ResizeObserver(publishHeight)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [onHeightChange, isVisible, title, pageChrome.subtitle, pageChrome.actions, pageChrome.search, pageChrome.guide])

  return (
    <header
      ref={headerRef}
      className={cn(
        'titlebar-drag absolute inset-x-0 top-0 z-20 flex min-h-[72px] shrink-0 items-center border-b border-border bg-background/80 px-[var(--berth-page-gutter)] py-3 backdrop-blur-xl transition-[opacity,transform,background-color] duration-200 ease-out motion-reduce:transition-none',
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0',
        isWindows && 'pr-44'
      )}
      data-testid="top-navigation"
      data-state={isVisible ? 'visible' : 'hidden'}
      aria-hidden={!isVisible}
    >
      <div className="grid w-full min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
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
          className="titlebar-no-drag flex min-w-0 flex-wrap items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-150 lg:justify-end"
        >
          {pageChrome.actions}
          {pageChrome.guide && (
            <div
              className="relative"
              data-testid="page-guide-hover-region"
              onPointerEnter={openGuide}
              onPointerLeave={scheduleGuideClose}
              onFocus={openGuide}
              onBlur={handleGuideBlur}
            >
              <button
                type="button"
                aria-expanded={guideOpen}
                aria-label={t('nav.pageGuide')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </button>
              {guideOpen && (
                <div
                  className="absolute right-0 top-full z-40 w-[min(42rem,calc(100vw-3rem))] pt-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150"
                  data-testid="page-guide-panel"
                  onPointerEnter={openGuide}
                  onPointerLeave={scheduleGuideClose}
                >
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
          {pageChrome.search && (
            <div className="relative min-w-[14rem] flex-1 sm:w-72 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={pageChrome.search.value}
                onChange={(event) => pageChrome.search?.onValueChange(event.target.value)}
                placeholder={pageChrome.search.placeholder}
                aria-label={pageChrome.search.ariaLabel ?? pageChrome.search.placeholder}
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-16 text-sm outline-none ring-ring transition-colors placeholder:text-muted-foreground hover:bg-muted/40 focus:ring-2"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground md:block">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </kbd>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
