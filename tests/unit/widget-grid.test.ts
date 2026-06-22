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

  it('maps height bands to integer row spans (1:2)', () => {
    expect(heightRowSpan('short')).toBe(1)
    expect(heightRowSpan('tall')).toBe(2)
  })

  it('computes pixel height with row gap baked into tall (2 shorts == 1 tall)', () => {
    expect(heightPx('short')).toBe(ROW_UNIT)
    expect(heightPx('tall')).toBe(2 * ROW_UNIT + ROW_GAP)
    // 两个 short 叠起 (含中间一个 ROW_GAP) 恰好 = 一个 tall 的占位高 → dense 无空隙
    expect(2 * heightPx('short') + ROW_GAP).toBe(heightPx('tall'))
  })

  it('derives list capacity from band height, larger for tall, at least 1', () => {
    expect(listCapacity('tall')).toBeGreaterThan(listCapacity('short'))
    expect(listCapacity('short')).toBeGreaterThanOrEqual(1)
  })
})
