import { Activity, AlertTriangle, RefreshCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ScanEngineControlDescriptor, ScanEngineInfo, ScanEngineSettings } from '@shared/types/ipc'
import { useScanEngineInfo } from '@/hooks/use-ipc'
import { cn } from '@/lib/utils'

function formatCount(value: number, language: string): string {
  return new Intl.NumberFormat(language).format(value)
}

function formatDate(value: string | undefined, language: string): string {
  if (!value) return '—'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return value
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(time)
}

function formatControlValue(
  control: ScanEngineControlDescriptor,
  language: string,
  t: ReturnType<typeof useTranslation>['t']
): string {
  if (control.unit === 'ms' && typeof control.value === 'number') {
    return `${formatCount(control.value, language)} ms`
  }
  if (typeof control.value === 'boolean') {
    return t(control.value ? 'common.yes' : 'common.no')
  }
  if (typeof control.value === 'string') {
    return t(`settings.scanEngine.values.${control.value}`, { defaultValue: control.value })
  }
  return formatCount(control.value, language)
}

function metricRows(info: ScanEngineInfo, language: string, t: ReturnType<typeof useTranslation>['t']): Array<{ label: string; value: string }> {
  return [
    {
      label: t('settings.scanEngine.metrics.assets'),
      value: t('settings.scanEngine.metrics.assetsValue', {
        count: info.snapshot.indexedAssets,
        formatted: formatCount(info.snapshot.indexedAssets, language)
      })
    },
    {
      label: t('settings.scanEngine.metrics.files'),
      value: t('settings.scanEngine.metrics.filesValue', {
        count: info.snapshot.indexedFiles,
        formatted: formatCount(info.snapshot.indexedFiles, language)
      })
    },
    {
      label: t('settings.scanEngine.metrics.errors'),
      value: t('settings.scanEngine.metrics.errorsValue', {
        count: info.snapshot.errors,
        formatted: formatCount(info.snapshot.errors, language)
      })
    },
    {
      label: t('settings.scanEngine.metrics.sources'),
      value: t('settings.scanEngine.metrics.sourcesValue', {
        count: info.snapshot.sourceRows,
        formatted: formatCount(info.snapshot.sourceRows, language)
      })
    }
  ]
}

function settingsPatchForControl(
  control: ScanEngineControlDescriptor,
  value: number
): Partial<ScanEngineSettings> | null {
  if (!control.settingKey) return null
  return { [control.settingKey]: value }
}

export function ScanEngineSettingsSection(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const language = i18n.language || 'en'
  const { info, loading, refreshing, saving, error, reload, refreshIndex, saveSettings } = useScanEngineInfo()

  const handleControlSubmit = (control: ScanEngineControlDescriptor) => (
    event: React.FormEvent<HTMLFormElement>
  ): void => {
    event.preventDefault()
    const rawValue = new FormData(event.currentTarget).get(control.id)
    const value = typeof rawValue === 'string' ? Number(rawValue) : Number.NaN
    if (!Number.isFinite(value)) return
    const patch = settingsPatchForControl(control, value)
    if (patch) saveSettings(patch)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">{t('settings.scanEngine.title')}</p>
            {info && (
              <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                v{info.engine.version}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('settings.scanEngine.description')}</p>
        </div>
        <button
          type="button"
          onClick={refreshIndex}
          disabled={refreshing}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors',
            'hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
        >
          <RefreshCcw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} aria-hidden="true" />
          {t('settings.scanEngine.refreshIndex')}
        </button>
      </div>

      <div className="space-y-4 p-4">
        {loading && !info && (
          <p className="text-sm text-muted-foreground">{t('settings.scanEngine.loading')}</p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-destructive">{t('settings.scanEngine.loadError')}</p>
              <p className="mt-0.5 break-words text-muted-foreground">{error}</p>
            </div>
            <button type="button" onClick={reload} className="font-medium text-foreground hover:underline">
              {t('common.retry')}
            </button>
          </div>
        )}

        {info && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t('settings.scanEngine.metrics.status')}
                </p>
                <p className="mt-1 truncate text-sm font-medium">
                  {t(`settings.scanEngine.status.${info.status.state}`)}
                </p>
              </div>
              {metricRows(info, language, t).slice(0, 3).map((row) => (
                <div key={row.label} className="rounded-md border border-border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
                  <p className="mt-1 truncate text-sm font-medium">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">{info.engine.name}</span>
                <span className="mx-1">·</span>
                <span>{info.snapshot.id}</span>
              </div>
              <div className="sm:text-right">
                {t('settings.scanEngine.lastCompleted', {
                  value: formatDate(info.status.lastCompletedAt, language)
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('settings.scanEngine.controls')}
              </p>
              <div className="divide-y divide-border rounded-md border border-border">
                {info.controls.map((control) => {
                  const label = t(`settings.scanEngine.controlLabels.${control.id}`)
                  const numericValue = typeof control.value === 'number' ? control.value : null
                  const canEditNumber = control.editable && control.settingKey && numericValue !== null
                  return (
                    <div key={control.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`settings.scanEngine.controlDescriptions.${control.id}`)}
                        </p>
                      </div>
                      {canEditNumber ? (
                        <form onSubmit={handleControlSubmit(control)} className="flex items-center gap-2">
                          <input
                            key={`${control.id}-${control.value}`}
                            aria-label={label}
                            name={control.id}
                            type="number"
                            defaultValue={numericValue ?? undefined}
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            className="h-8 w-28 rounded-md border border-input bg-background px-2 text-right text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                          />
                          <button
                            type="submit"
                            disabled={saving}
                            className="h-8 rounded-md border border-border px-2 text-xs font-medium hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving ? t('settings.scanEngine.saving') : t('settings.scanEngine.saveControl')}
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {formatControlValue(control, language, t)}
                        </span>
                      )}
                      <span
                        className={cn(
                          'w-fit rounded-md border px-2 py-0.5 text-xs',
                          control.supported
                            ? control.editable
                              ? 'border-primary/30 text-primary'
                              : 'border-border text-muted-foreground'
                            : 'border-muted text-muted-foreground opacity-80'
                        )}
                      >
                        {control.supported
                          ? control.editable
                            ? t('settings.scanEngine.editable')
                            : t('settings.scanEngine.readOnly')
                          : t('settings.scanEngine.unsupported')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
