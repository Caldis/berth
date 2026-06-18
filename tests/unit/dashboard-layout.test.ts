import { describe, expect, it } from 'vitest'
import {
  DASHBOARD_LAYOUT_VERSION,
  defaultLayout,
  migrateLayout,
  parseLayout,
  resetLayout,
  serializeLayout,
  type DashboardLayout
} from '@/lib/dashboard-layout'

describe('defaultLayout', () => {
  it('lists all catalog widgets ordered by defaultOrder with default sizes/visibility', () => {
    const layout = defaultLayout()
    expect(layout.version).toBe(DASHBOARD_LAYOUT_VERSION)
    expect(layout.widgets).toHaveLength(11)
    expect(layout.widgets[0].id).toBe('stats-band')
    expect(layout.widgets.at(-1)?.id).toBe('session-duration')
    const byId = Object.fromEntries(layout.widgets.map((w) => [w.id, w]))
    expect(byId['stats-band'].size).toBe('Wide')
    expect(byId['activity-heatmap'].size).toBe('XL')
    expect(byId['token-breakdown'].hidden).toBe(true)
    expect(byId['model-distribution'].hidden).toBe(true)
    expect(byId['recent-sessions'].hidden).toBe(false)
  })
})

describe('migrateLayout', () => {
  it('preserves stored order/size/hidden then appends missing widgets in defaultOrder', () => {
    const stored: DashboardLayout = {
      version: 1,
      widgets: [{ id: 'recent-sessions', size: 'M', hidden: true }]
    }
    const out = migrateLayout(stored)
    expect(out.widgets).toHaveLength(11)
    expect(out.widgets[0]).toEqual({ id: 'recent-sessions', size: 'M', hidden: true })
    expect(out.widgets.slice(1).map((w) => w.id)).toEqual([
      'stats-band',
      'activity-heatmap',
      'activity-insights',
      'top-usage',
      'usage-trend',
      'quick-actions',
      'token-breakdown',
      'model-distribution',
      'activity-rhythm',
      'session-duration'
    ])
    // appended widgets inherit catalog defaults
    const appended = Object.fromEntries(out.widgets.slice(1).map((w) => [w.id, w]))
    expect(appended['token-breakdown'].hidden).toBe(true)
    expect(appended['stats-band'].size).toBe('Wide')
  })

  it('drops unknown widget ids', () => {
    const stored = {
      version: 1,
      widgets: [{ id: 'ghost-widget', size: 'M', hidden: false }]
    } as unknown as DashboardLayout
    const out = migrateLayout(stored)
    expect(out.widgets).toHaveLength(11)
    expect(out.widgets.some((w) => w.id === ('ghost-widget' as never))).toBe(false)
  })

  it('clamps an invalid size to the widget default but keeps valid sizes', () => {
    const stored = {
      version: 1,
      widgets: [
        { id: 'stats-band', size: 'S', hidden: false }, // S not allowed for stats-band
        { id: 'activity-heatmap', size: 'Wide', hidden: false } // valid
      ]
    } as unknown as DashboardLayout
    const out = migrateLayout(stored)
    const byId = Object.fromEntries(out.widgets.map((w) => [w.id, w]))
    expect(byId['stats-band'].size).toBe('Wide')
    expect(byId['activity-heatmap'].size).toBe('Wide')
  })

  it('dedups repeated widget ids', () => {
    const stored = {
      version: 1,
      widgets: [
        { id: 'stats-band', size: 'Wide', hidden: false },
        { id: 'stats-band', size: 'XL', hidden: true }
      ]
    } as unknown as DashboardLayout
    const out = migrateLayout(stored)
    expect(out.widgets.filter((w) => w.id === 'stats-band')).toHaveLength(1)
    expect(out.widgets[0]).toEqual({ id: 'stats-band', size: 'Wide', hidden: false })
  })
})

describe('migrateLayout chartType', () => {
  it('preserves a stored chartType string', () => {
    const stored = {
      version: 1,
      widgets: [{ id: 'token-breakdown', size: 'M', hidden: false, chartType: 'donut' }]
    } as unknown as DashboardLayout
    const out = migrateLayout(stored)
    expect(out.widgets[0]).toEqual({ id: 'token-breakdown', size: 'M', hidden: false, chartType: 'donut' })
  })

  it('omits a non-string / empty chartType (no key added)', () => {
    const stored = {
      version: 1,
      widgets: [
        { id: 'token-breakdown', size: 'M', hidden: false, chartType: 123 },
        { id: 'model-distribution', size: 'M', hidden: false, chartType: '' }
      ]
    } as unknown as DashboardLayout
    const out = migrateLayout(stored)
    const byId = Object.fromEntries(out.widgets.map((w) => [w.id, w]))
    expect('chartType' in byId['token-breakdown']).toBe(false)
    expect('chartType' in byId['model-distribution']).toBe(false)
  })

  it('round-trips chartType through serialize → parse', () => {
    const stored: DashboardLayout = {
      version: 1,
      widgets: [{ id: 'usage-trend', size: 'Wide', hidden: false, chartType: 'area' }]
    }
    const out = parseLayout(serializeLayout(stored))
    expect(out.widgets[0]).toEqual({ id: 'usage-trend', size: 'Wide', hidden: false, chartType: 'area' })
  })
})

describe('parseLayout', () => {
  it('falls back to default for empty / corrupt / shapeless input', () => {
    expect(parseLayout(null)).toEqual(defaultLayout())
    expect(parseLayout('')).toEqual(defaultLayout())
    expect(parseLayout('not json{')).toEqual(defaultLayout())
    expect(parseLayout('{"foo":1}')).toEqual(defaultLayout())
    expect(parseLayout('[]')).toEqual(defaultLayout())
  })

  it('parses and migrates a stored layout', () => {
    const stored: DashboardLayout = { version: 1, widgets: [{ id: 'usage-trend', size: 'L', hidden: false }] }
    const out = parseLayout(serializeLayout(stored))
    expect(out.widgets[0]).toEqual({ id: 'usage-trend', size: 'L', hidden: false })
    expect(out.widgets).toHaveLength(11)
  })
})

describe('serializeLayout / resetLayout', () => {
  it('round-trips through serialize → parse', () => {
    const layout = defaultLayout()
    expect(parseLayout(serializeLayout(layout))).toEqual(layout)
  })

  it('resetLayout equals defaultLayout', () => {
    expect(resetLayout()).toEqual(defaultLayout())
  })
})
