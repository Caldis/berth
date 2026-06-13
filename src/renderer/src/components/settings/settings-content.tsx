import { useState, useEffect, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Accent } from '@/components/theme-provider'
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
import { UpdateSection } from '@/components/settings/update-section'
import { ScanEngineSettingsSection } from '@/components/settings/scan-engine-settings-section'
import appIconUrl from '../../../../../assets/icon/app_icon.png'

const OFFICIAL_WEBSITE_URL = 'http://berth.caldis.me/'
const GITHUB_URL = 'https://github.com/Caldis/berth'
const ISSUE_URL = 'https://github.com/Caldis/berth/issues'

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

interface SettingsContentProps {
  showTitle?: boolean
  className?: string
  onOpenPluginDetail?: (pluginId: string) => void
}

export function SettingsContent({
  showTitle = true,
  className,
  onOpenPluginDetail
}: SettingsContentProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { theme, setTheme, accent, setAccent } = useTheme()
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
    window.api?.platform.info().then(setPlatformInfo).catch(() => {})
  }, [])

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

  // Swatch hues mirror the html[data-accent] blocks in globals.css.
  const accents: Array<{ id: Accent; label: string; color: string }> = [
    { id: 'neutral', label: 'Neutral', color: 'hsl(var(--foreground))' },
    { id: 'blue', label: 'Blue', color: 'hsl(212 100% 47%)' },
    { id: 'violet', label: 'Violet', color: 'hsl(262 83% 58%)' },
    { id: 'emerald', label: 'Emerald', color: 'hsl(160 84% 39%)' },
    { id: 'amber', label: 'Amber', color: 'hsl(38 92% 50%)' },
    { id: 'rose', label: 'Rose', color: 'hsl(350 89% 60%)' },
    { id: 'orange', label: 'Orange', color: 'hsl(17 96% 55%)' }
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
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <themeOption.icon className="h-4 w-4" aria-hidden="true" />
                    {t(themeOption.labelKey)}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
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
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {lang.label}
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="text-sm font-medium">
              {t('settings.accentColor', { defaultValue: 'Accent color' })}
            </label>
            <div
              className="mt-2 flex gap-2.5"
              role="radiogroup"
              aria-label={t('settings.accentColor', { defaultValue: 'Accent color' })}
            >
              {accents.map((accentOption, index) => {
                const isSelected = accent === accentOption.id

                return (
                  <button
                    key={accentOption.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={t(`settings.accent.${accentOption.id}`, {
                      defaultValue: accentOption.label
                    })}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setAccent(accentOption.id)}
                    onKeyDown={(event) => {
                      handleRadioKeyDown(event, index, accents.length, (nextIndex) => {
                        setAccent(accents[nextIndex].id)
                      })
                    }}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all hover:scale-105',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isSelected ? 'border-foreground' : 'border-transparent'
                    )}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ backgroundColor: accentOption.color }}
                    >
                      {isSelected && (
                        <Check
                          className={cn(
                            'h-3 w-3',
                            accentOption.id === 'neutral' ? 'text-background' : 'text-white'
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </span>
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
        <ScanEngineSettingsSection />
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
        </div>
      </section>

      <AgentCapabilityPluginsSection
        plugins={agentPlugins}
        manifests={agentPluginManifests}
        loading={agentPluginsLoading}
        stale={agentPluginsStale}
        error={agentPluginsError}
        onOpenPluginDetail={onOpenPluginDetail}
      />

      {/* About */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('settings.about')}
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <img
              src={appIconUrl}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-lg"
              data-testid="settings-app-icon"
            />
            <div>
              <p className="font-medium">{t('app.name')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.version')} {platformInfo?.version ?? '0.1.0'} · {t('app.tagline')}
              </p>
            </div>
          </div>
          <UpdateSection />
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <button
              onClick={() => window.api?.shell.openExternal(OFFICIAL_WEBSITE_URL)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {t('settings.website')}
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              onClick={() => window.api?.shell.openExternal(GITHUB_URL)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              onClick={() => window.api?.shell.openExternal(ISSUE_URL)}
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
