import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type DependencyList,
  type ReactNode
} from 'react'
import type { AgentView } from '@shared/types/asset'
import type { FeatureGuideDefinition, FeatureGuideEvidence } from '@/lib/feature-guidance'

export interface PageChromeGuide {
  definition: FeatureGuideDefinition
  evidence?: FeatureGuideEvidence[]
  agentView?: AgentView
}

export interface PageChromeConfig {
  title?: ReactNode
  subtitle?: ReactNode
  sectionLabelKey?: string
  parentLabel?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  guide?: PageChromeGuide
}

interface PageChromeContextValue {
  config: PageChromeConfig
  resetPageChrome: () => void
  setPageChrome: (config: PageChromeConfig) => void
}

const PageChromeContext = createContext<PageChromeContextValue | null>(null)

const EMPTY_PAGE_CHROME: PageChromeConfig = {}

export function PageChromeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [config, setConfig] = useState<PageChromeConfig>(EMPTY_PAGE_CHROME)
  const setPageChrome = useCallback((nextConfig: PageChromeConfig) => setConfig(nextConfig), [])
  const resetPageChrome = useCallback(() => setConfig(EMPTY_PAGE_CHROME), [])
  const value = useMemo<PageChromeContextValue>(
    () => ({
      config,
      resetPageChrome,
      setPageChrome
    }),
    [config, resetPageChrome, setPageChrome]
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
