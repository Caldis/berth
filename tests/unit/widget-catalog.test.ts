import { describe, expect, it } from 'vitest'
import { ALL_WIDGET_IDS, WIDGET_CATALOG } from '@/components/dashboard/widget-catalog'
import type { WidgetWidth, WidgetHeight } from '@/components/dashboard/widget-types'

const VALID_WIDTHS: WidgetWidth[] = ['W1', 'W2', 'W4']
const VALID_HEIGHTS: WidgetHeight[] = ['short', 'tall']

describe('WIDGET_CATALOG', () => {
  it('keys its entries by their own id', () => {
    for (const [key, meta] of Object.entries(WIDGET_CATALOG)) {
      expect(meta.id).toBe(key)
    }
  })

  it('exposes every id via ALL_WIDGET_IDS', () => {
    expect(ALL_WIDGET_IDS.sort()).toEqual(Object.keys(WIDGET_CATALOG).sort())
  })

  it('declares non-empty valid width/height bands with defaultSize included', () => {
    for (const meta of Object.values(WIDGET_CATALOG)) {
      expect(meta.widths.length).toBeGreaterThan(0)
      expect(meta.heights.length).toBeGreaterThan(0)
      for (const w of meta.widths) expect(VALID_WIDTHS).toContain(w)
      for (const h of meta.heights) expect(VALID_HEIGHTS).toContain(h)
      // defaultSize must be a legal band combination
      expect(meta.widths).toContain(meta.defaultSize.w)
      expect(meta.heights).toContain(meta.defaultSize.h)
    }
  })

  it('uses a non-empty i18n titleKey under overview.widgets', () => {
    for (const meta of Object.values(WIDGET_CATALOG)) {
      expect(meta.titleKey).toMatch(/^overview\.widgets\./)
    }
  })

  it('assigns a unique defaultOrder to each widget', () => {
    const orders = Object.values(WIDGET_CATALOG).map((m) => m.defaultOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })
})
