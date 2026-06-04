import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const component = fs.readFileSync(
  path.join(root, 'src/renderer/src/components/shared/token-usage-display.tsx'),
  'utf8'
)

describe('TokenUsageDisplay 配色真源接入', () => {
  it('不再使用 Tailwind 硬编码段色 (改走 CSS 变量, 暗色自适应)', () => {
    expect(component).not.toContain('bg-blue-500')
    expect(component).not.toContain('bg-emerald-500')
    expect(component).not.toContain('bg-amber-500')
    expect(component).not.toContain('bg-violet-500')
  })

  it('段色来自 chart-colors 单一真源', () => {
    expect(component).toContain('TOKEN_SEGMENT_COLOR_VAR')
    expect(component).toContain("from '@/lib/chart-colors'")
  })
})
