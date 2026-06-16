import { useState } from 'react'
import { Activity, AlertTriangle, Minus, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Virtuoso } from 'react-virtuoso'
import type { Asset } from '@shared/types/asset'
import type {
  ScanEngineControlDescriptor,
  ScanEngineControlGroup,
  ScanEngineInfo,
  ScanEngineSettings,
  ScanError
} from '@shared/types/ipc'
import { useScanEngineInfo } from '@/hooks/use-ipc'
import { useAppStore } from '@/stores/app'
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
  Tooltip,
  useDisclosure
} from '@/components/ui'
import type { ChipTone } from '@/components/ui'
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

// Status value → semantic chip tone (GH-135 G3). Active/healthy reads green,
// transient (paused/stale) amber, errors red, neutral modes gray.
const STATUS_TONE: Record<string, ChipTone> = {
  available: 'success',
  active: 'success',
  ready: 'success',
  scanning: 'primary',
  paused: 'warning',
  stale: 'warning',
  none: 'neutral',
  idle: 'neutral',
  unsupported: 'neutral',
  manual: 'neutral',
  watcher: 'neutral',
  startup: 'neutral',
  'project-scope': 'neutral',
  error: 'danger'
}

// Full enum set per runtime-status control so the hover tooltip can show where the
// current value sits among all possible states (GH-135 G3/G6).
const STATUS_ENUMS: Record<string, string[]> = {
  pause: ['active', 'paused'],
  cancel: ['scanning', 'idle'],
  'scheduled-refresh': ['none', 'manual', 'watcher', 'project-scope'],
  'queued-refresh': ['none', 'manual', 'watcher', 'project-scope'],
  'last-scan-reason': ['startup', 'manual', 'watcher', 'project-scope', 'none']
}

function statusTone(value: string): ChipTone {
  return STATUS_TONE[value] ?? 'neutral'
}

/** Format a periodic-scan interval (ms) at a human magnitude for the next-scan
 * tooltip — whole hours when it divides evenly, else minutes. */
function formatInterval(ms: number, t: Translate): string {
  if (ms > 0 && ms % 3_600_000 === 0) return `${ms / 3_600_000} ${t('settings.scanEngine.units.h')}`
  return `${Math.round(ms / 60_000)} ${t('settings.scanEngine.units.min')}`
}

// GH-135 G6: numeric runtime-state values (last-scan duration, source group count)
// render as plain text — they are measurements, not enum states.
function formatStatusNumber(control: ScanEngineControlDescriptor, language: string, t: Translate): string {
  const value = typeof control.value === 'number' ? control.value : 0
  if (control.unit === 'ms') {
    if (value <= 0) return '—'
    return value < 1000
      ? `${value} ${t('settings.scanEngine.units.ms')}`
      : `${(value / 1000).toFixed(1)} ${t('settings.scanEngine.units.s')}`
  }
  return formatCount(value, language)
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

type DetailMetric = 'assets' | 'files' | 'errors'

function metricRows(
  info: ScanEngineInfo,
  language: string,
  t: Translate
): Array<{ id: DetailMetric; label: string; value: string }> {
  return [
    {
      id: 'assets',
      label: t('settings.scanEngine.metrics.assets'),
      value: t('settings.scanEngine.metrics.assetsValue', {
        count: info.snapshot.indexedAssets,
        formatted: formatCount(info.snapshot.indexedAssets, language)
      })
    },
    {
      id: 'files',
      label: t('settings.scanEngine.metrics.files'),
      value: t('settings.scanEngine.metrics.filesValue', {
        count: info.snapshot.indexedFiles,
        formatted: formatCount(info.snapshot.indexedFiles, language)
      })
    },
    {
      id: 'errors',
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

// GH-135 G3: a runtime-status value as a semantic chip; hovering shows the control's
// description and the full enum set with the current value marked, so the user can
// place "where am I" among all possible states.
function StatusValueChip({ control, t }: { control: ScanEngineControlDescriptor; t: Translate }): React.ReactElement {
  const supported = control.supported
  const value = supported ? String(control.value) : 'unsupported'
  const label = supported
    ? t(`settings.scanEngine.values.${value}`, { defaultValue: value })
    : t('settings.scanEngine.unsupported')
  const enums = STATUS_ENUMS[control.id] ?? [value]
  const description = t(`settings.scanEngine.controlDescriptions.${control.id}`, { defaultValue: '' })
  const tooltip = (
    <div className="max-w-[15rem] space-y-1.5 p-1">
      {description && <p className="text-xs text-foreground">{description}</p>}
      <ul className="space-y-1">
        {enums.map((v) => {
          const current = v === value
          return (
            <li
              key={v}
              className={cn('flex items-center gap-1.5 text-xs', current ? 'text-foreground' : 'text-muted-foreground')}
            >
              <span
                className={cn('h-1.5 w-1.5 shrink-0 rounded-full', current ? 'bg-primary' : 'bg-muted-foreground/30')}
                aria-hidden="true"
              />
              <span>{t(`settings.scanEngine.values.${v}`, { defaultValue: v })}</span>
              {current && <span className="text-[10px] uppercase text-primary">{t('settings.scanEngine.statusCurrent')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
  return (
    <Tooltip content={tooltip} placement="left" closeDelay={0}>
      <span className="cursor-default">
        <Chip tone={statusTone(value)} size="sm">
          {label}
        </Chip>
      </span>
    </Tooltip>
  )
}

// GH-135 G4: scan-exclude list as a standard path-add control — a removable row per
// path plus an "add directory" button that opens the native picker (multi-select),
// instead of a free-text textarea. The engine stays the source of truth; picks are
// merged + de-duped and written back via save().
function ExcludePathsControl({
  control,
  save,
  saving,
  t
}: {
  control: ScanEngineControlDescriptor
  save: Saver
  saving: boolean
  t: Translate
}): React.ReactElement {
  const key = control.settingKey
  const paths = Array.isArray(control.value) ? control.value : []
  const addDirectory = async (): Promise<void> => {
    const picked = await window.api.dialog.openDirectory()
    if (!key || picked.length === 0) return
    const next = Array.from(new Set([...paths, ...picked]))
    if (next.length !== paths.length) save({ [key]: next } as Partial<ScanEngineSettings>)
  }
  const removePath = (path: string): void => {
    if (!key) return
    save({ [key]: paths.filter((p) => p !== path) } as Partial<ScanEngineSettings>)
  }
  return (
    <div className="w-full max-w-sm space-y-1.5 sm:w-72">
      {paths.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('settings.scanEngine.excludeEmpty')}</p>
      ) : (
        <ul className="space-y-1">
          {paths.map((path) => (
            <li key={path} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-xs text-foreground" title={path}>
                {path}
              </span>
              <button
                type="button"
                onClick={() => removePath(path)}
                disabled={saving}
                aria-label={t('settings.scanEngine.excludeRemove', { path })}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
              >
                <Minus className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addDirectory}
        disabled={saving}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('settings.scanEngine.excludeAdd')}
      </button>
    </div>
  )
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
    return <ExcludePathsControl control={control} save={save} saving={saving} t={t} />
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

// GH-135 G2: one compact row in the scanned-assets detail modal. Virtualized, so
// 1000+ rows stay smooth (react-virtuoso renders only the visible window).
function AssetDetailRow({ asset }: { asset: Asset }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5 text-xs">
      <Chip size="sm" tone="neutral" className="shrink-0">
        {asset.type}
      </Chip>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={asset.name}>
        {asset.name}
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{asset.scope}</span>
      <span className="min-w-0 max-w-[42%] shrink-0 truncate text-muted-foreground/70" title={asset.path}>
        {asset.path}
      </span>
    </div>
  )
}

function ScanErrorDetailRow({ error }: { error: ScanError }): React.ReactElement {
  return (
    <div className="border-b border-border/40 px-3 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <Chip size="sm" tone="danger" className="shrink-0">
          {error.type}
        </Chip>
        <span className="min-w-0 flex-1 truncate text-muted-foreground/70" title={error.path}>
          {error.path}
        </span>
      </div>
      <p className="mt-0.5 break-words text-destructive">{error.message}</p>
    </div>
  )
}

// GH-135 G2: clicking the assets/files/errors metric opens a modal listing every
// scanned result. Dense table, virtualized for the high row count.
function ScannedDetailModal({
  metric,
  assets,
  errors,
  onClose,
  t
}: {
  metric: DetailMetric | null
  assets: Asset[]
  errors: ScanError[]
  onClose: () => void
  t: Translate
}): React.ReactElement {
  const isErrors = metric === 'errors'
  const count = isErrors ? errors.length : assets.length
  return (
    <Modal isOpen={metric !== null} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          {metric && t(`settings.scanEngine.detail.${metric}Title`)}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
        </ModalHeader>
        <ModalBody className="p-0">
          {count === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t('settings.scanEngine.detail.empty')}
            </p>
          ) : isErrors ? (
            <Virtuoso
              style={{ height: '60vh' }}
              data={errors}
              itemContent={(_, error) => <ScanErrorDetailRow error={error} />}
            />
          ) : (
            <Virtuoso
              style={{ height: '60vh' }}
              data={assets}
              itemContent={(_, asset) => <AssetDetailRow asset={asset} />}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="light" onPress={onClose}>
            {t('common.close')}
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
  // GH-135 G2: the scanned results live in the central store (engine projection);
  // the detail modal lists them on demand.
  const assets = useAppStore((s) => s.assets)
  const scanErrors = useAppStore((s) => s.assetErrors)
  const [detailMetric, setDetailMetric] = useState<DetailMetric | null>(null)

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
              <Tooltip
                placement="top"
                content={
                  <p className="max-w-[14rem] p-1 text-xs">{t('settings.scanEngine.metricDescriptions.status')}</p>
                }
              >
                <div className="cursor-default rounded-md border border-border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('settings.scanEngine.metrics.status')}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {t(`settings.scanEngine.status.${info.status.state}`)}
                  </p>
                </div>
              </Tooltip>
              {metricRows(info, language, t).map((row) => (
                <Tooltip
                  key={row.id}
                  placement="top"
                  content={
                    <p className="max-w-[14rem] p-1 text-xs">
                      {t(`settings.scanEngine.metricDescriptions.${row.id}`)}
                    </p>
                  }
                >
                  <button
                    type="button"
                    onClick={() => setDetailMetric(row.id)}
                    className="rounded-md border border-border p-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
                    <p className="mt-1 truncate text-sm font-medium">{row.value}</p>
                  </button>
                </Tooltip>
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
                  <Tooltip
                    placement="left"
                    content={
                      <p className="max-w-[16rem] p-1 text-xs">
                        {t('settings.scanEngine.nextScanFormula', {
                          interval: formatInterval(info.scheduler.periodicScan.intervalMs, t)
                        })}
                      </p>
                    }
                  >
                    <div className="inline-block cursor-default tabular-nums underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                      {t('settings.scanEngine.nextScan', {
                        value: formatDate(info.scheduler.periodicScan.nextScanAt, language)
                      })}
                    </div>
                  </Tooltip>
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
                      {typeof control.value === 'number' ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatStatusNumber(control, language, t)}
                        </span>
                      ) : (
                        <StatusValueChip control={control} t={t} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RebuildConfirmDialog isOpen={rebuildDialog.isOpen} onClose={rebuildDialog.onClose} onConfirm={rebuild} />
      <ScannedDetailModal
        metric={detailMetric}
        assets={assets}
        errors={scanErrors}
        onClose={() => setDetailMetric(null)}
        t={t}
      />
    </div>
  )
}
