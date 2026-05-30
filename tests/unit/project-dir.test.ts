import { describe, expect, it } from 'vitest'
import { resolveDefaultProjectDir } from '../../src/main/project-dir'

describe('resolveDefaultProjectDir', () => {
  it('omits project scope in dev mode', () => {
    expect(resolveDefaultProjectDir({ isDev: true, cwd: 'D:\\Code\\berth' })).toBeUndefined()
  })

  it('uses cwd outside dev mode', () => {
    expect(resolveDefaultProjectDir({ isDev: false, cwd: '/Applications/Berth.app' })).toBe(
      '/Applications/Berth.app'
    )
  })
})

