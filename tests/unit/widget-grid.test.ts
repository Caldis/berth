import { describe, expect, it } from 'vitest'
import {
  ROW_UNIT,
  ROW_GAP,
  widthColSpanClass,
  heightRowSpan,
  heightPx,
  listCapacity
} from '@/lib/widget-grid'

describe('widget-grid geometry', () => {
  it('maps width bands to responsive col-span classes', () => {
    expect(widthColSpanClass('W1')).toBe('col-span-1')
    expect(widthColSpanClass('W2')).toContain('xl:col-span-2')
    expect(widthColSpanClass('W4')).toContain('xl:col-span-4')
  })

  it('maps height bands to integer row spans (mini/short/tall = 1/2/4)', () => {
    expect(heightRowSpan('mini')).toBe(1)
    expect(heightRowSpan('short')).toBe(2)
    expect(heightRowSpan('tall')).toBe(4)
  })

  it('computes pixel height; bands stack as integer multiples (dense 无空隙)', () => {
    expect(heightPx('mini')).toBe(ROW_UNIT)
    expect(heightPx('short')).toBe(2 * ROW_UNIT + ROW_GAP)
    expect(heightPx('tall')).toBe(4 * ROW_UNIT + 3 * ROW_GAP)
    // 2 mini (含中间 gap) == 1 short; 2 short == 1 tall → dense 整数倍填空
    expect(2 * heightPx('mini') + ROW_GAP).toBe(heightPx('short'))
    expect(2 * heightPx('short') + ROW_GAP).toBe(heightPx('tall'))
  })

  it('derives list capacity from band height, larger for tall, at least 1', () => {
    expect(listCapacity('tall')).toBeGreaterThan(listCapacity('short'))
    expect(listCapacity('short')).toBeGreaterThanOrEqual(1)
  })
})
