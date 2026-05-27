import { useTranslation } from 'react-i18next'
import { useTheme } from '@/components/theme-provider'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Settings(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

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
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      {/* Appearance */}
      <section className="space-y-4">
        <h2 className="text-base font-medium">{t('settings.appearance')}</h2>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="text-sm font-medium">{t('settings.theme')}</label>
            <div className="mt-2 flex gap-2">
              {themes.map((t_) => (
                <button
                  key={t_.id}
                  onClick={() => setTheme(t_.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    theme === t_.id
                      ? 'border-accent bg-accent/10 text-accent-foreground'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  <t_.icon className="h-4 w-4" />
                  {t(t_.labelKey)}
                  {theme === t_.id && <Check className="h-3.5 w-3.5 text-accent" />}
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
                      ? 'border-accent bg-accent/10 text-accent-foreground'
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
      <section className="space-y-4">
        <h2 className="text-base font-medium">{t('settings.scanning')}</h2>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('settings.fileWatching')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.fileWatchingDesc')}</p>
            </div>
            <div className="h-5 w-9 rounded-full bg-accent" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-sm font-medium">{t('settings.advancedMode')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.advancedModeDesc')}</p>
            </div>
            <div className="h-5 w-9 rounded-full bg-muted" />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="space-y-4">
        <h2 className="text-base font-medium">{t('settings.about')}</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              B
            </div>
            <div>
              <p className="font-medium">{t('app.name')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.version')} 0.1.0 · {t('app.tagline')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
