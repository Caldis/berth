import { describe, expect, it } from 'vitest'
import * as path from 'path'
import { resolveDefaultProjectDir } from '../../src/main/project-dir'

describe('resolveDefaultProjectDir', () => {
  it('omits project scope in dev mode', () => {
    expect(resolveDefaultProjectDir({ isDev: true, cwd: 'D:\\Code\\berth' })).toBeUndefined()
  })

  it('omits unsafe packaged app cwd values outside dev mode', () => {
    expect(resolveDefaultProjectDir({ isDev: false, cwd: '/' })).toBeUndefined()
    expect(resolveDefaultProjectDir({ isDev: false, cwd: '/Applications/Berth.app' })).toBeUndefined()
    expect(resolveDefaultProjectDir({ isDev: false, cwd: '/Applications/Berth.app/Contents/Resources' })).toBeUndefined()
    expect(resolveDefaultProjectDir({ isDev: false, cwd: 'C:\\' })).toBeUndefined()
    expect(resolveDefaultProjectDir({ isDev: false, cwd: 'C:\\Users\\me\\Apps\\Berth.app' })).toBeUndefined()
  })

  it('uses a real project cwd outside dev mode', () => {
    expect(resolveDefaultProjectDir({ isDev: false, cwd: '/Users/me/Code/berth' })).toBe(path.resolve('/Users/me/Code/berth'))
    expect(resolveDefaultProjectDir({ isDev: false, cwd: 'D:\\Code\\berth' })).toBe('D:\\Code\\berth')
  })
})
