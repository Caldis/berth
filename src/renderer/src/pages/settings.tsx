import { useState, useEffect } from 'react'
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
import { useAgentCapabilityPlugins, useScanSources } from '@/hooks/use-ipc'
import { AgentCapabilityPluginsSection } from '@/components/settings/agent-capability-plugins-section'
import { LocalSourcesSection } from '@/components/settings/local-sources-section'

function Toggle({
  enabled,
  onToggle
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
}): React.ReactElement {
  return (
    <button
      role="switch"
      aria-checked={enabled}
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
  const { groups: scanSourceGroups, loading: scanSourcesLoading } = useScanSources()
  const {
    plugins: agentPlugins,
    loading: agentPluginsLoading,
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
            <div className="mt-2 flex gap-2">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    theme === themeOption.id
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  <themeOption.icon className="h-4 w-4" />
                  {t(themeOption.labelKey)}
                  {theme === themeOption.id && <Check className="h-3.5 w-3.5 text-accent" />}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <label className="text-sm font-medium">{t('settings.language')}</label>
            <div className="mt-2 flex gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    i18n.changeLanguage(lang.id)
                    localStorage.setItem('berth-language', lang.id)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    i18n.language === lang.id
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {lang.label}
                  {i18n.language === lang.id && (
                    <Check className="h-3.5 w-3.5 text-accent" />
                  )}
                </button>
              ))}
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
            <Toggle enabled={advancedMode} onToggle={handleAdvancedMode} />
          </div>
        </div>
      </section>

      <AgentCapabilityPluginsSection
        plugins={agentPlugins}
        loading={agentPluginsLoading}
        error={agentPluginsError}
      />

      <LocalSourcesSection groups={scanSourceGroups} loading={scanSourcesLoading} />

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
              Report Issue
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
