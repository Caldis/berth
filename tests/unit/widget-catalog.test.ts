import { describe, expect, it } from 'vitest'
import { ALL_WIDGET_IDS, WIDGET_CATALOG } from '@/components/dashboard/widget-catalog'
import type { WidgetSize } from '@/components/dashboard/widget-types'

const VALID_SIZES: WidgetSize[] = ['S', 'M', 'L', 'Wide', 'XL']

describe('WIDGET_CATALOG', () => {
  it('keys its entries by their own id', () => {
    for (const [key, meta] of Object.entries(WIDGET_CATALOG)) {
      expect(meta.id).toBe(key)
    }
  })

  it('exposes every id via ALL_WIDGET_IDS', () => {
    expect(ALL_WIDGET_IDS.sort()).toEqual(Object.keys(WIDGET_CATALOG).sort())
  })

  it('declares non-empty valid sizes with defaultSize included', () => {
    for (const meta of Object.values(WIDGET_CATALOG)) {
      expect(meta.sizes.length).toBeGreaterThan(0)
      for (const size of meta.sizes) expect(VALID_SIZES).toContain(size)
      expect(meta.sizes).toContain(meta.defaultSize)
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
