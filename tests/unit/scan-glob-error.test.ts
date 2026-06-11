import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// GH-111 O3: a glob failure must surface as a ScanError instead of silently
// dropping assets. Isolated file so the glob mock doesn't affect other tests.
vi.mock('glob', () => ({
  glob: {
    sync: () => {
      throw new Error('EACCES: permission denied')
    }
  },
  sync: () => {
    throw new Error('EACCES: permission denied')
  }
}))

import { scanInstructions, type ScanContext } from '@berth/scan-engine/adapters/claude-code/scanner'

let claudeDir: string

beforeEach(() => {
  claudeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-gh111-glob-'))
  // The skills dir must exist so scanDir reaches safeGlob (which then throws).
  fs.mkdirSync(path.join(claudeDir, 'skills'), { recursive: true })
})

afterEach(() => {
  fs.rmSync(claudeDir, { recursive: true, force: true })
})

describe('O3 glob failure is observable', () => {
  it('records a glob ScanError when glob throws instead of silently returning []', () => {
    const ctx: ScanContext = { claudeDir, errors: [] }
    scanInstructions(ctx)
    expect(ctx.errors.some((e) => e.type === 'glob')).toBe(true)
  })
})
