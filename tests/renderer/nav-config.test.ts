import { describe, it, expect } from 'vitest'
import { navSections } from '../../src/renderer/src/components/layout/nav-config'

describe('sidebar nav-config', () => {
  const items = navSections.flatMap((s) => s.items)

  it('每个导航项的 path 唯一 (防 Claude Code/Sessions 双高亮回归)', () => {
    const paths = items.map((i) => i.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('不再含已删除的 Claude Code 占位项', () => {
    expect(items.map((i) => i.id)).not.toContain('claude-code')
  })
})
