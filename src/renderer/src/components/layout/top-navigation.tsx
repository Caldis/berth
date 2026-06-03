import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { findNavMatch } from './nav-config'

type BreadcrumbItem = {
  key: string
  labelKey: string
}

function routeBreadcrumbs(pathname: string, search = ''): BreadcrumbItem[] {
  if (/^\/sessions\/[^/]+/.test(pathname)) {
    return [{ key: 'sessions', labelKey: 'nav.sessions' }]
  }

  const match = findNavMatch(pathname, search)
  if (match) {
    return match.section.labelKey ? [{ key: match.section.id, labelKey: match.section.labelKey }] : []
  }

  return []
}

export function TopNavigation({ isWindows }: { isWindows: boolean }): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const breadcrumbs = useMemo(
    () => routeBreadcrumbs(location.pathname, location.search),
    [location.pathname, location.search]
  )

  return (
    <header
      className={cn(
        'titlebar-drag flex h-11 shrink-0 items-center border-b border-border bg-background/95 px-4',
        isWindows && 'pr-44'
      )}
      data-testid="top-navigation"
    >
      {breadcrumbs.length > 0 && (
        <nav
          className="titlebar-no-drag flex min-w-0 items-center gap-1 text-sm"
          aria-label={t('nav.breadcrumb')}
        >
          {breadcrumbs.map((item, index) => (
            <span key={`${item.key}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span
                className={cn(
                  'truncate',
                  index === breadcrumbs.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {t(item.labelKey)}
              </span>
            </span>
          ))}
        </nav>
      )}
    </header>
  )
}
