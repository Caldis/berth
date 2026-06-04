import { describe, expect, it } from 'vitest'
import {
  CHART_SERIES_FILL,
  CHART_CATEGORICAL,
  TOKEN_SEGMENT_COLOR_VAR
} from '../../src/renderer/src/lib/chart-colors'

describe('chart-colors 配色真源', () => {
  it('同质序列图统一用中性 primary 单色', () => {
    expect(CHART_SERIES_FILL).toBe('hsl(var(--primary))')
  })

  it('多分类语义色板为 5 色, 依次引用 --chart-1..5', () => {
    expect(CHART_CATEGORICAL).toHaveLength(5)
    CHART_CATEGORICAL.forEach((color, i) => {
      expect(color).toBe(`hsl(var(--chart-${i + 1}))`)
    })
  })

  it('token 段固定语义映射到 --chart 变量, unknown 用中性 muted', () => {
    expect(TOKEN_SEGMENT_COLOR_VAR.input).toBe('--chart-1')
    expect(TOKEN_SEGMENT_COLOR_VAR.output).toBe('--chart-2')
    expect(TOKEN_SEGMENT_COLOR_VAR.cache).toBe('--chart-3')
    expect(TOKEN_SEGMENT_COLOR_VAR.reasoning).toBe('--chart-4')
    expect(TOKEN_SEGMENT_COLOR_VAR.unknown).toBe('--muted-foreground')
  })
})
