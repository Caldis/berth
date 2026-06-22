import { describe, expect, it } from 'vitest'
import { ROW_UNIT, ROW_GAP, widthColSpanClass } from '@/lib/widget-grid'

describe('widget-grid geometry', () => {
  it('maps width bands to responsive col-span classes', () => {
    expect(widthColSpanClass('W1')).toBe('col-span-1')
    expect(widthColSpanClass('W2')).toContain('xl:col-span-2')
    expect(widthColSpanClass('W4')).toContain('xl:col-span-4')
  })

  it('exposes a small positive row unit + gap for content-driven integer quantization', () => {
    // 高度由内容驱动 + 量化到 ROW_UNIT 整数倍 (span 由 use-masonry-rows 按内容高测算)。
    expect(ROW_UNIT).toBeGreaterThan(0)
    expect(ROW_GAP).toBeGreaterThan(0)
  })
})
