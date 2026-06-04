import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

export type Accent = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'

export const ACCENTS: Accent[] = ['blue', 'violet', 'emerald', 'amber', 'rose']

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  accent: Accent
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  accent: 'blue',
  setAccent: () => {}
})

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function isAccent(value: string | null): value is Accent {
  return value != null && (ACCENTS as string[]).includes(value)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultAccent = 'blue'
}: {
  children: ReactNode
  defaultTheme?: Theme
  defaultAccent?: Accent
}): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('berth-theme') as Theme) || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    theme === 'system' ? getSystemTheme() : theme
  )
  const [accent, setAccentState] = useState<Accent>(() => {
    const stored = localStorage.getItem('berth-accent')
    return isAccent(stored) ? stored : defaultAccent
  })

  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      const resolved = getSystemTheme()
      setResolvedTheme(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  const setTheme = (newTheme: Theme): void => {
    localStorage.setItem('berth-theme', newTheme)
    setThemeState(newTheme)
    window.api?.theme.set(newTheme)
  }

  const setAccent = (newAccent: Accent): void => {
    localStorage.setItem('berth-accent', newAccent)
    setAccentState(newAccent)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
