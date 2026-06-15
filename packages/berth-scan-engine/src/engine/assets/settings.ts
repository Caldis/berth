import type {
  ScanEngineControlDescriptor,
  ScanEngineControlGroup,
  ScanEngineControlId,
  ScanEngineControlUnit,
  ScanEnginePreset,
  ScanEngineSettings
} from '@shared/types/ipc'

export const DEFAULT_SCAN_ENGINE_SETTINGS: ScanEngineSettings = {
  preset: 'balanced',
  watcherDebounceMs: 1_000,
  watcherMinIntervalMs: 30_000,
  periodicScanEnabled: true,
  periodicScanIntervalMs: 86_400_000, // 24h
  idleOnly: false,
  idleThresholdMs: 60_000,
  scanConcurrency: 2,
  batchPauseMs: 50,
  acOnlyFullScan: true,
  minFreeDiskMb: 1_024,
  excludePaths: [],
  respectGitignore: true,
  contentHash: false,
  osThrottleEnabled: true
}

/** Settings keys with numeric clamp/step limits. boolean/string[]/preset keys are
 * normalized separately (they have no min/max). */
type NumberSettingKey =
  | 'watcherDebounceMs'
  | 'watcherMinIntervalMs'
  | 'periodicScanIntervalMs'
  | 'idleThresholdMs'
  | 'scanConcurrency'
  | 'batchPauseMs'
  | 'minFreeDiskMb'

export const SCAN_ENGINE_SETTING_LIMITS = {
  watcherDebounceMs: { min: 0, max: 10_000, step: 100 },
  watcherMinIntervalMs: { min: 0, max: 300_000, step: 1_000 },
  periodicScanIntervalMs: { min: 0, max: 604_800_000, step: 3_600_000 }, // 0=off..7d, 1h step
  idleThresholdMs: { min: 30_000, max: 600_000, step: 30_000 },
  scanConcurrency: { min: 1, max: 8, step: 1 },
  batchPauseMs: { min: 0, max: 500, step: 10 },
  minFreeDiskMb: { min: 0, max: 10_000, step: 256 }
} as const satisfies Record<NumberSettingKey, { min: number; max: number; step: number }>

/** Tuning presets (GH-135). Each overrides only the perf/power/schedule levers;
 * other fields fall back to DEFAULT. Raw-value edits flip preset→'custom'
 * (caller-managed in the runtime/UI, not here). */
export const SCAN_ENGINE_PRESETS: Record<'eco' | 'balanced' | 'performance', Partial<ScanEngineSettings>> = {
  eco: { scanConcurrency: 1, batchPauseMs: 150, periodicScanIntervalMs: 604_800_000, acOnlyFullScan: true, idleOnly: true },
  balanced: { scanConcurrency: 2, batchPauseMs: 50, periodicScanIntervalMs: 86_400_000, acOnlyFullScan: true, idleOnly: false },
  performance: { scanConcurrency: 4, batchPauseMs: 0, periodicScanIntervalMs: 21_600_000, acOnlyFullScan: false, idleOnly: false }
}

const VALID_PRESETS: readonly ScanEnginePreset[] = ['eco', 'balanced', 'performance', 'custom']

export interface ScanEngineSettingsStore {
  load(): Partial<ScanEngineSettings> | null
  save(settings: ScanEngineSettings): void
}

/** Merge a named preset onto DEFAULT and stamp the preset id (GH-135). */
export function applyScanEnginePreset(preset: 'eco' | 'balanced' | 'performance'): ScanEngineSettings {
  return { ...DEFAULT_SCAN_ENGINE_SETTINGS, ...SCAN_ENGINE_PRESETS[preset], preset }
}

/** GH-135 E3: the user-configurable setting controls for the GUI (all B-strategy
 * params, grouped + typed). getEngineInfo splices these into controls[] so the
 * settings panel renders the right widget per kind without hand-listing each. */
export function buildScanEngineSettingControls(
  settings: ScanEngineSettings,
  platform: NodeJS.Platform
): ScanEngineControlDescriptor[] {
  return [
    {
      id: 'preset',
      value: settings.preset,
      kind: 'enum',
      group: 'preset',
      options: ['eco', 'balanced', 'performance', 'custom'],
      editable: true,
      supported: true,
      settingKey: 'preset'
    },
    numControl('watcher-debounce-ms', 'watcherDebounceMs', 'watcher', settings.watcherDebounceMs, 'ms'),
    numControl('watcher-min-interval-ms', 'watcherMinIntervalMs', 'watcher', settings.watcherMinIntervalMs, 'ms'),
    boolControl('periodic-scan-enabled', 'periodicScanEnabled', 'schedule', settings.periodicScanEnabled),
    numControl('periodic-scan-interval-ms', 'periodicScanIntervalMs', 'schedule', settings.periodicScanIntervalMs, 'ms'),
    boolControl('idle-only', 'idleOnly', 'schedule', settings.idleOnly),
    numControl('idle-threshold-ms', 'idleThresholdMs', 'schedule', settings.idleThresholdMs, 'ms'),
    numControl('scan-concurrency', 'scanConcurrency', 'performance', settings.scanConcurrency),
    numControl('batch-pause-ms', 'batchPauseMs', 'performance', settings.batchPauseMs, 'ms'),
    boolControl('content-hash', 'contentHash', 'performance', settings.contentHash),
    boolControl('os-throttle-enabled', 'osThrottleEnabled', 'performance', settings.osThrottleEnabled, platform !== 'win32'),
    boolControl('ac-only-full-scan', 'acOnlyFullScan', 'power', settings.acOnlyFullScan),
    numControl('min-free-disk-mb', 'minFreeDiskMb', 'power', settings.minFreeDiskMb),
    {
      id: 'exclude-paths',
      value: settings.excludePaths,
      kind: 'string-list',
      group: 'scope',
      editable: true,
      supported: true,
      settingKey: 'excludePaths'
    },
    boolControl('respect-gitignore', 'respectGitignore', 'scope', settings.respectGitignore)
  ]
}

function numControl(
  id: ScanEngineControlId,
  settingKey: NumberSettingKey,
  group: ScanEngineControlGroup,
  value: number,
  unit?: ScanEngineControlUnit
): ScanEngineControlDescriptor {
  return {
    id,
    value,
    kind: 'number',
    group,
    editable: true,
    supported: true,
    settingKey,
    ...(unit ? { unit } : {}),
    ...SCAN_ENGINE_SETTING_LIMITS[settingKey]
  }
}

function boolControl(
  id: ScanEngineControlId,
  settingKey: keyof ScanEngineSettings,
  group: ScanEngineControlGroup,
  value: boolean,
  supported = true
): ScanEngineControlDescriptor {
  return { id, value, kind: 'boolean', group, editable: true, supported, settingKey }
}

export function normalizeScanEngineSettings(input?: Partial<ScanEngineSettings> | null): ScanEngineSettings {
  const d = DEFAULT_SCAN_ENGINE_SETTINGS
  return {
    preset: normalizePreset(input?.preset),
    watcherDebounceMs: num(input?.watcherDebounceMs, 'watcherDebounceMs'),
    watcherMinIntervalMs: num(input?.watcherMinIntervalMs, 'watcherMinIntervalMs'),
    periodicScanEnabled: bool(input?.periodicScanEnabled, d.periodicScanEnabled),
    periodicScanIntervalMs: num(input?.periodicScanIntervalMs, 'periodicScanIntervalMs'),
    idleOnly: bool(input?.idleOnly, d.idleOnly),
    idleThresholdMs: num(input?.idleThresholdMs, 'idleThresholdMs'),
    scanConcurrency: num(input?.scanConcurrency, 'scanConcurrency'),
    batchPauseMs: num(input?.batchPauseMs, 'batchPauseMs'),
    acOnlyFullScan: bool(input?.acOnlyFullScan, d.acOnlyFullScan),
    minFreeDiskMb: num(input?.minFreeDiskMb, 'minFreeDiskMb'),
    excludePaths: strList(input?.excludePaths, d.excludePaths),
    respectGitignore: bool(input?.respectGitignore, d.respectGitignore),
    contentHash: bool(input?.contentHash, d.contentHash),
    osThrottleEnabled: bool(input?.osThrottleEnabled, d.osThrottleEnabled)
  }
}

function normalizePreset(value: unknown): ScanEnginePreset {
  return typeof value === 'string' && (VALID_PRESETS as readonly string[]).includes(value)
    ? (value as ScanEnginePreset)
    : DEFAULT_SCAN_ENGINE_SETTINGS.preset
}

function num(value: number | undefined, key: NumberSettingKey): number {
  return normalizeNumberSetting(value, DEFAULT_SCAN_ENGINE_SETTINGS[key], SCAN_ENGINE_SETTING_LIMITS[key])
}

function bool(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function strList(value: string[] | undefined, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function normalizeNumberSetting(
  value: number | undefined,
  fallback: number,
  limits: { min: number; max: number; step: number }
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const clamped = Math.min(limits.max, Math.max(limits.min, value))
  const stepped = Math.round(clamped / limits.step) * limits.step
  return Math.min(limits.max, Math.max(limits.min, stepped))
}
