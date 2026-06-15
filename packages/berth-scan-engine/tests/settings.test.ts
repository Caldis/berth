import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SCAN_ENGINE_SETTINGS,
  SCAN_ENGINE_PRESETS,
  applyScanEnginePreset,
  normalizeScanEngineSettings
} from '../src/engine/assets/settings'

describe('scan engine settings (GH-135)', () => {
  describe('normalizeScanEngineSettings', () => {
    it('returns defaults for empty / nullish input', () => {
      expect(normalizeScanEngineSettings()).toEqual(DEFAULT_SCAN_ENGINE_SETTINGS)
      expect(normalizeScanEngineSettings(null)).toEqual(DEFAULT_SCAN_ENGINE_SETTINGS)
      expect(normalizeScanEngineSettings({})).toEqual(DEFAULT_SCAN_ENGINE_SETTINGS)
    })

    it('clamps numbers to limits', () => {
      expect(normalizeScanEngineSettings({ scanConcurrency: 99 }).scanConcurrency).toBe(8)
      expect(normalizeScanEngineSettings({ scanConcurrency: 0 }).scanConcurrency).toBe(1)
      expect(normalizeScanEngineSettings({ batchPauseMs: 9999 }).batchPauseMs).toBe(500)
      expect(normalizeScanEngineSettings({ batchPauseMs: -50 }).batchPauseMs).toBe(0)
    })

    it('aligns numbers to step', () => {
      expect(normalizeScanEngineSettings({ batchPauseMs: 53 }).batchPauseMs).toBe(50)
      expect(normalizeScanEngineSettings({ idleThresholdMs: 44_000 }).idleThresholdMs).toBe(30_000)
    })

    it('falls back on non-finite / wrong-type numbers', () => {
      expect(normalizeScanEngineSettings({ scanConcurrency: NaN }).scanConcurrency).toBe(
        DEFAULT_SCAN_ENGINE_SETTINGS.scanConcurrency
      )
      expect(normalizeScanEngineSettings({ batchPauseMs: Infinity }).batchPauseMs).toBe(
        DEFAULT_SCAN_ENGINE_SETTINGS.batchPauseMs
      )
    })

    it('coerces booleans, falls back for non-boolean', () => {
      expect(normalizeScanEngineSettings({ contentHash: true }).contentHash).toBe(true)
      expect(normalizeScanEngineSettings({ periodicScanEnabled: false }).periodicScanEnabled).toBe(false)
      expect(normalizeScanEngineSettings({ idleOnly: 'yes' as unknown as boolean }).idleOnly).toBe(
        DEFAULT_SCAN_ENGINE_SETTINGS.idleOnly
      )
    })

    it('filters excludePaths to non-empty strings', () => {
      expect(normalizeScanEngineSettings({ excludePaths: ['a', '', '  ', 'b'] }).excludePaths).toEqual(['a', 'b'])
      expect(normalizeScanEngineSettings({ excludePaths: [1, 'x'] as unknown as string[] }).excludePaths).toEqual(['x'])
      expect(normalizeScanEngineSettings({ excludePaths: 'nope' as unknown as string[] }).excludePaths).toEqual([])
    })

    it('validates preset enum, falls back to default for unknown', () => {
      expect(normalizeScanEngineSettings({ preset: 'eco' }).preset).toBe('eco')
      expect(normalizeScanEngineSettings({ preset: 'custom' }).preset).toBe('custom')
      expect(normalizeScanEngineSettings({ preset: 'bogus' as unknown as never }).preset).toBe(
        DEFAULT_SCAN_ENGINE_SETTINGS.preset
      )
    })
  })

  describe('applyScanEnginePreset', () => {
    it('merges preset overrides onto defaults and stamps the id', () => {
      const eco = applyScanEnginePreset('eco')
      expect(eco.preset).toBe('eco')
      expect(eco.scanConcurrency).toBe(SCAN_ENGINE_PRESETS.eco.scanConcurrency)
      expect(eco.batchPauseMs).toBe(150)
      expect(eco.idleOnly).toBe(true)
      expect(eco.respectGitignore).toBe(DEFAULT_SCAN_ENGINE_SETTINGS.respectGitignore)
    })

    it('performance preset maximizes throughput', () => {
      const perf = applyScanEnginePreset('performance')
      expect(perf.scanConcurrency).toBe(4)
      expect(perf.batchPauseMs).toBe(0)
      expect(perf.acOnlyFullScan).toBe(false)
    })

    it('every preset is step-aligned (normalizes idempotently)', () => {
      for (const p of ['eco', 'balanced', 'performance'] as const) {
        const applied = applyScanEnginePreset(p)
        expect(normalizeScanEngineSettings(applied)).toEqual(applied)
      }
    })
  })
})
