import { useState, useEffect, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/components/theme-provider'
import {
  Sun,
  Moon,
  Monitor,
  Check,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentCapabilityPlugins } from '@/hooks/use-ipc'
import { AgentCapabilityPluginsSection } from '@/components/settings/agent-capability-plugins-section'

function getNextRadioIndex(key: string, currentIndex: number, optionCount: number): number | null {
  if (optionCount <= 0) return null

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % optionCount
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + optionCount) % optionCount
    case 'Home':
      return 0
    case 'End':
      return optionCount - 1
    default:
      return null
  }
}

function handleRadioKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  currentIndex: number,
  optionCount: number,
  selectIndex: (index: number) => void
): void {
  const nextIndex = getNextRadioIndex(event.key, currentIndex, optionCount)
  if (nextIndex === null) return

  event.preventDefault()
  selectIndex(nextIndex)
  const radioButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  radioButtons?.[nextIndex]?.focus()
}

function Toggle({
  enabled,
  onToggle,
  ariaLabel
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  ariaLabel: string
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => onToggle(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        enabled ? 'bg-accent' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm ring-1 ring-border transition-transform',
          enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  )
}

interface SettingsContentProps {
  showTitle?: boolean
  className?: string
}

export function SettingsContent({
  showTitle = true,
  className
}: SettingsContentProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [advancedMode, setAdvancedMode] = useState(false)
  const {
    plugins: agentPlugins,
    manifests: agentPluginManifests,
    loading: agentPluginsLoading,
    stale: agentPluginsStale,
    error: agentPluginsError
  } = useAgentCapabilityPlugins()
  const [platformInfo, setPlatformInfo] = useState<{
    homeDir: string
    version: string
    platform: string
  } | null>(null)

  useEffect(() => {
    setAdvancedMode(localStorage.getItem('berth-advanced-mode') === 'true')
    window.api?.platform.info().then(setPlatformInfo).catch(() => {})
  }, [])

  const handleAdvancedMode = (v: boolean): void => {
    setAdvancedMode(v)
    localStorage.setItem('berth-advanced-mode', String(v))
  }

  const selectLanguage = (language: string): void => {
    void i18n.changeLanguage(language)
    localStorage.setItem('berth-language', language)
  }

  const themes = [
    { id: 'light' as const, labelKey: 'settings.themeLight', icon: Sun },
    { id: 'dark' as const, labelKey: 'settings.themeDark', icon: Moon },
    { id: 'system' as const, labelKey: 'settings.themeSystem', icon: Monitor }
  ]

  const languages = [
    { id: 'en', label: 'English' },
    { id: 'zh', label: '中文' }
  ]

  return (
    <div className={cn(showTitle ? 'mx-auto max-w-2xl space-y-8' : 'space-y-5', className)}>
      {showTitle && <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>}

      {/* Appearance */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('settings.appearance')}
        </h2>
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div>
            <label className="text-sm font-medium">{t('settings.theme')}</label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t('settings.theme')}>
              {themes.map((themeOption, index) => {
                const isSelected = theme === themeOption.id

                return (
                  <button
                    key={themeOption.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setTheme(themeOption.id)}
                    onKeyDown={(event) => {
                      handleRadioKeyDown(event, index, themes.length, (nextIndex) => {
                        setTheme(themes[nextIndex].id)
                      })
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <themeOption.icon className="h-4 w-4" aria-hidden="true" />
                    {t(themeOption.labelKey)}
                    {isSelected && <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="text-sm font-medium">{t('settings.language')}</label>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t('settings.language')}>
              {languages.map((lang, index) => {
                const isSelected = i18n.language === lang.id

                return (
                  <button
                    key={lang.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => selectLanguage(lang.id)}
                    onKeyDown={(event) => {
                      handleRadioKeyDown(event, index, languages.length, (nextIndex) => {
                        selectLanguage(languages[nextIndex].id)
                      })
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    {lang.label}
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Scanning */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('settings.scanning')}
        </h2>
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">{t('settings.fileWatching')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.fileWatchingDesc')}</p>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
              {t('settings.automatic')}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border p-4">
            <div>
              <p className="text-sm font-medium">{t('settings.advancedMode')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.advancedModeDesc')}</p>
            </div>
            <Toggle
              enabled={advancedMode}
              onToggle={handleAdvancedMode}
              ariaLabel={t('settings.advancedMode')}
            />
          </div>
        </div>
      </section>

      <AgentCapabilityPluginsSection
        plugins={agentPlugins}
        manifests={agentPluginManifests}
        loading={agentPluginsLoading}
        stale={agentPluginsStale}
        error={agentPluginsError}
      />

      {/* About */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('settings.about')}
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              B
            </div>
            <div>
              <p className="font-medium">{t('app.name')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.version')} {platformInfo?.version ?? '0.1.0'} · {t('app.tagline')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <button
              onClick={() => window.api?.shell.openExternal('https://github.com/Caldis/berth')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              GitHub
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              onClick={() => window.api?.shell.openExternal('https://github.com/Caldis/berth/issues')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('settings.reportIssue')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
