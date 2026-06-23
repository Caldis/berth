import { describe, expect, it } from 'vitest'
import { widthColSpanClass } from '@/lib/widget-grid'

describe('widget-grid geometry', () => {
  it('maps width bands to responsive col-span classes', () => {
    expect(widthColSpanClass('W1')).toBe('col-span-1')
    expect(widthColSpanClass('W2')).toContain('xl:col-span-2')
    expect(widthColSpanClass('W4')).toContain('xl:col-span-4')
  })
})
