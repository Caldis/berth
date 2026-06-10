import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode
} from 'react'
import type { FeatureGuideDefinition, FeatureGuideEvidence } from '@/lib/feature-guidance'

export interface PageChromeGuide {
  definition: FeatureGuideDefinition
  evidence?: FeatureGuideEvidence[]
}

export interface PageChromeSearch {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  ariaLabel?: string
}

export interface PageChromeConfig {
  title?: ReactNode
  subtitle?: ReactNode
  sectionLabelKey?: string
  parentLabel?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  guide?: PageChromeGuide
  search?: PageChromeSearch
}

interface PageChromeContextValue {
  config: PageChromeConfig
  focusPageSearch: () => boolean
  resetPageChrome: () => void
  setPageChrome: (config: PageChromeConfig) => void
  setPageSearchFocusHandler: (handler: (() => void) | null) => void
}

const PageChromeContext = createContext<PageChromeContextValue | null>(null)

const EMPTY_PAGE_CHROME: PageChromeConfig = {}

export function PageChromeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [config, setConfig] = useState<PageChromeConfig>(EMPTY_PAGE_CHROME)
  const searchFocusHandlerRef = useRef<(() => void) | null>(null)
  const setPageChrome = useCallback((nextConfig: PageChromeConfig) => setConfig(nextConfig), [])
  const resetPageChrome = useCallback(() => setConfig(EMPTY_PAGE_CHROME), [])
  const setPageSearchFocusHandler = useCallback((handler: (() => void) | null) => {
    searchFocusHandlerRef.current = handler
  }, [])
  const focusPageSearch = useCallback(() => {
    if (!searchFocusHandlerRef.current) return false
    searchFocusHandlerRef.current()
    return true
  }, [])
  const value = useMemo<PageChromeContextValue>(
    () => ({
      config,
      focusPageSearch,
      resetPageChrome,
      setPageChrome,
      setPageSearchFocusHandler
    }),
    [config, focusPageSearch, resetPageChrome, setPageChrome, setPageSearchFocusHandler]
  )

  return (
    <PageChromeContext.Provider value={value}>
      {children}
    </PageChromeContext.Provider>
  )
}

export function useCurrentPageChrome(): PageChromeConfig {
  return useContext(PageChromeContext)?.config ?? EMPTY_PAGE_CHROME
}

export function useFocusPageSearch(): () => boolean {
  return useContext(PageChromeContext)?.focusPageSearch ?? (() => false)
}

export function useRegisterPageSearchFocus(handler: (() => void) | null, deps: DependencyList = [handler]): void {
  const setPageSearchFocusHandler = useContext(PageChromeContext)?.setPageSearchFocusHandler

  useEffect(() => {
    if (!setPageSearchFocusHandler) return undefined
    setPageSearchFocusHandler(handler)
    return () => setPageSearchFocusHandler(null)
    // The caller owns handler dependencies because the focus target is usually a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPageSearchFocusHandler, ...deps])
}

export function usePageChrome(config: PageChromeConfig, deps: DependencyList = [config]): void {
  const context = useContext(PageChromeContext)
  const setPageChrome = context?.setPageChrome
  const resetPageChrome = context?.resetPageChrome

  useEffect(() => {
    if (!setPageChrome || !resetPageChrome) return undefined
    setPageChrome(config)
    return () => resetPageChrome()
    // Page callers own the dependency list because actions are often memoized React nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPageChrome, resetPageChrome, ...deps])
}
