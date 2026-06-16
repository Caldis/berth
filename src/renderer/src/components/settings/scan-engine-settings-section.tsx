import { Activity, AlertTriangle, RefreshCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  ScanEngineControlDescriptor,
  ScanEngineControlGroup,
  ScanEngineInfo,
  ScanEngineSettings
} from '@shared/types/ipc'
import { useScanEngineInfo } from '@/hooks/use-ipc'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
  Textarea,
  useDisclosure
} from '@/components/ui'
import { cn } from '@/lib/utils'

type Translate = ReturnType<typeof useTranslation>['t']
type Saver = (patch: Partial<ScanEngineSettings>) => void

// Settings controls are grouped (GH-135 E3); status controls (no group) render
// read-only below. Preset leads so the user picks a tier before touching raw values.
const SETTING_GROUPS: ScanEngineControlGroup[] = ['preset', 'schedule', 'performance', 'scope', 'power', 'watcher']

// Human-friendly display unit per numeric setting (GH-135). The engine stores the
// raw base value (ms / MB) as the single source of truth; this table is a pure
// rendering choice — show each value at a magnitude a person can read, with a unit
// suffix, and convert back to the base on save. Units are picked per-parameter, not
// uniformly: batch-pause/debounce live at ms/sec scale, so "minutes" would be absurd
// there; only genuinely large values use minutes/hours. settingKeys absent here
// (e.g. scanConcurrency, a dimensionless count) render as a plain unit-less number.
const NUMBER_DISPLAY: Record<string, { unit: string; divisor: number; step: number }> = {
  periodicScanIntervalMs: { unit: 'h', divisor: 3_600_000, step: 1 },
  idleThresholdMs: { unit: 'min', divisor: 60_000, step: 0.5 },
  watcherDebounceMs: { unit: 's', divisor: 1_000, step: 0.1 },
  watcherMinIntervalMs: { unit: 's', divisor: 1_000, step: 1 },
  batchPauseMs: { unit: 'ms', divisor: 1, step: 10 },
  minFreeDiskMb: { unit: 'mb', divisor: 1, step: 256 }
}

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

function metricRows(
  info: ScanEngineInfo,
  language: string,
  t: Translate
): Array<{ label: string; value: string }> {
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
    }
  ]
}

function readonlyValue(control: ScanEngineControlDescriptor, language: string, t: Translate): string {
  if (!control.supported) return t('settings.scanEngine.unsupported')
  if (control.unit === 'ms' && typeof control.value === 'number') {
    return `${formatCount(control.value, language)} ms`
  }
  if (typeof control.value === 'boolean') return t(control.value ? 'common.yes' : 'common.no')
  if (typeof control.value === 'string') {
    return t(`settings.scanEngine.values.${control.value}`, { defaultValue: control.value })
  }
  if (Array.isArray(control.value)) return control.value.join(', ') || '—'
  return formatCount(control.value, language)
}

function NumberControlInput({
  control,
  save,
  saving,
  label,
  t
}: {
  control: ScanEngineControlDescriptor
  save: Saver
  saving: boolean
  label: string
  t: Translate
}): React.ReactElement {
  const key = control.settingKey
  const display = key ? NUMBER_DISPLAY[key] : undefined
  const divisor = display?.divisor ?? 1
  // base (ms/MB) → display value, trimming float noise (e.g. 90000/60000 = 1.5).
  const toDisplay = (base: number): number => Math.round((base / divisor) * 1000) / 1000
  const unitLabel = display ? t(`settings.scanEngine.units.${display.unit}`) : null
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const raw = new FormData(event.currentTarget).get(control.id)
        const entered = typeof raw === 'string' ? Number(raw) : Number.NaN
        // display value → base; the engine re-clamps/steps on save, so rounding here is safe.
        if (key && Number.isFinite(entered)) save({ [key]: Math.round(entered * divisor) } as Partial<ScanEngineSettings>)
      }}
      className="flex items-center gap-1.5"
    >
      <div className="flex h-8 w-28 items-center rounded-md border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40">
        <input
          key={`${control.id}-${String(control.value)}`}
          aria-label={label}
          name={control.id}
          type="number"
          defaultValue={typeof control.value === 'number' ? toDisplay(control.value) : undefined}
          min={control.min !== undefined ? control.min / divisor : undefined}
          max={control.max !== undefined ? control.max / divisor : undefined}
          step={display?.step ?? control.step}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-right text-xs text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {unitLabel && <span className="shrink-0 pr-2 text-xs tabular-nums text-muted-foreground">{unitLabel}</span>}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="h-8 rounded-md border border-border px-2 text-xs font-medium transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? t('settings.scanEngine.saving') : t('settings.scanEngine.saveControl')}
      </button>
    </form>
  )
}

function ControlInput({
  control,
  save,
  saving,
  language,
  t
}: {
  control: ScanEngineControlDescriptor
  save: Saver
  saving: boolean
  language: string
  t: Translate
}): React.ReactElement {
  const label = t(`settings.scanEngine.controlLabels.${control.id}`)
  const key = control.settingKey

  if (control.kind === 'boolean' && key) {
    return (
      <Switch
        size="sm"
        aria-label={label}
        isSelected={Boolean(control.value)}
        isDisabled={!control.supported || saving}
        onValueChange={(v) => save({ [key]: v } as Partial<ScanEngineSettings>)}
      />
    )
  }
  if (control.kind === 'enum' && key) {
    return (
      <Select
        size="sm"
        aria-label={label}
        className="w-36"
        selectedKeys={[String(control.value)]}
        isDisabled={saving}
        onChange={(event) => {
          if (event.target.value) save({ [key]: event.target.value } as Partial<ScanEngineSettings>)
        }}
      >
        {(control.options ?? []).map((opt) => (
          <SelectItem key={opt}>{t(`settings.scanEngine.values.${opt}`, { defaultValue: opt })}</SelectItem>
        ))}
      </Select>
    )
  }
  if (control.kind === 'string-list' && key) {
    return (
      <Textarea
        size="sm"
        aria-label={label}
        minRows={1}
        className="w-52"
        defaultValue={(control.value as string[]).join('\n')}
        placeholder={t('settings.scanEngine.excludePlaceholder')}
        onBlur={(event) =>
          save({
            [key]: event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          } as Partial<ScanEngineSettings>)
        }
      />
    )
  }
  if (control.kind === 'number' && control.editable && key && typeof control.value === 'number') {
    return <NumberControlInput control={control} save={save} saving={saving} label={label} t={t} />
  }
  return <span className="text-xs text-muted-foreground">{readonlyValue(control, language, t)}</span>
}

function ControlRow({
  control,
  save,
  saving,
  language,
  t
}: {
  control: ScanEngineControlDescriptor
  save: Saver
  saving: boolean
  language: string
  t: Translate
}): React.ReactElement {
  const label = t(`settings.scanEngine.controlLabels.${control.id}`)
  const description = t(`settings.scanEngine.controlDescriptions.${control.id}`, { defaultValue: '' })
  return (
    <div className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center justify-start sm:justify-end">
        <ControlInput control={control} save={save} saving={saving} language={language} t={t} />
      </div>
    </div>
  )
}

function RebuildConfirmDialog({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}): React.ReactElement {
  const { t } = useTranslation()
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {t('settings.scanEngine.rebuild.title')}
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted-foreground">{t('settings.scanEngine.rebuild.body')}</p>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="light" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            color="danger"
            onPress={() => {
              onConfirm()
              onClose()
            }}
          >
            {t('settings.scanEngine.rebuild.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export function ScanEngineSettingsSection(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const language = i18n.language || 'en'
  const { info, loading, refreshing, saving, error, reload, refreshIndex, saveSettings, rebuild } = useScanEngineInfo()
  const rebuildDialog = useDisclosure()

  const settingControls = info?.controls.filter((control) => control.group) ?? []
  const statusControls = info?.controls.filter((control) => !control.group) ?? []

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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={rebuildDialog.onOpen}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-2.5 text-xs font-medium text-destructive transition-colors',
              'hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40'
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('settings.scanEngine.rebuild.action')}
          </button>
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
      </div>

      <div className="space-y-4 p-4">
        {loading && !info && <p className="text-sm text-muted-foreground">{t('settings.scanEngine.loading')}</p>}

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
              {metricRows(info, language, t).map((row) => (
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
                <div>
                  {t('settings.scanEngine.lastCompleted', { value: formatDate(info.status.lastCompletedAt, language) })}
                </div>
                {info.scheduler.periodicScan.enabled && info.scheduler.periodicScan.nextScanAt && (
                  <div className="tabular-nums">
                    {t('settings.scanEngine.nextScan', {
                      value: formatDate(info.scheduler.periodicScan.nextScanAt, language)
                    })}
                  </div>
                )}
              </div>
            </div>

            {SETTING_GROUPS.map((group) => {
              const controls = settingControls.filter((control) => control.group === group)
              if (controls.length === 0) return null
              return (
                <div key={group} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t(`settings.scanEngine.groups.${group}`)}
                  </p>
                  <div className="divide-y divide-border rounded-md border border-border">
                    {controls.map((control) => (
                      <ControlRow
                        key={control.id}
                        control={control}
                        save={saveSettings}
                        saving={saving}
                        language={language}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {statusControls.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('settings.scanEngine.groups.status')}
                </p>
                <div className="divide-y divide-border rounded-md border border-border">
                  {statusControls.map((control) => (
                    <div key={control.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="font-medium">{t(`settings.scanEngine.controlLabels.${control.id}`)}</span>
                      <span className="text-xs text-muted-foreground">{readonlyValue(control, language, t)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RebuildConfirmDialog isOpen={rebuildDialog.isOpen} onClose={rebuildDialog.onClose} onConfirm={rebuild} />
    </div>
  )
}
