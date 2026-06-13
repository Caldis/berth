import type { ScanEngineSettings } from '@shared/types/ipc'

export const DEFAULT_SCAN_ENGINE_SETTINGS: ScanEngineSettings = {
  watcherDebounceMs: 1_000,
  watcherMinIntervalMs: 30_000
}

export const SCAN_ENGINE_SETTING_LIMITS = {
  watcherDebounceMs: { min: 0, max: 10_000, step: 100 },
  watcherMinIntervalMs: { min: 0, max: 300_000, step: 1_000 }
} as const satisfies Record<keyof ScanEngineSettings, { min: number; max: number; step: number }>

export interface ScanEngineSettingsStore {
  load(): Partial<ScanEngineSettings> | null
  save(settings: ScanEngineSettings): void
}

export function normalizeScanEngineSettings(input?: Partial<ScanEngineSettings> | null): ScanEngineSettings {
  return {
    watcherDebounceMs: normalizeNumberSetting(
      input?.watcherDebounceMs,
      DEFAULT_SCAN_ENGINE_SETTINGS.watcherDebounceMs,
      SCAN_ENGINE_SETTING_LIMITS.watcherDebounceMs
    ),
    watcherMinIntervalMs: normalizeNumberSetting(
      input?.watcherMinIntervalMs,
      DEFAULT_SCAN_ENGINE_SETTINGS.watcherMinIntervalMs,
      SCAN_ENGINE_SETTING_LIMITS.watcherMinIntervalMs
    )
  }
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
