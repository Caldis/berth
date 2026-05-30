import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHome = vi.hoisted(() => ({ dir: '' }))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return {
    ...actual,
    homedir: () => mockHome.dir
  }
})

import { CodexAdapter } from '../../src/main/adapters/codex'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(process.env['TEMP'] ?? process.cwd(), 'berth-codex-adapter-'))
  mockHome.dir = tempDir
})

afterEach(() => {
  vi.restoreAllMocks()
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('CodexAdapter', () => {
  it('reports Codex as missing when ~/.codex does not exist', async () => {
    const adapter = new CodexAdapter()

    await expect(adapter.detect()).resolves.toEqual({
      installed: false,
      paths: []
    })
  })

  it('reports ~/.codex/sessions as the actual scan root', async () => {
    const codexDir = path.join(mockHome.dir, '.codex')
    const sessionsDir = path.join(codexDir, 'sessions')
    fs.mkdirSync(sessionsDir, { recursive: true })
    const adapter = new CodexAdapter()

    await expect(adapter.detect()).resolves.toEqual({
      installed: true,
      paths: [
        {
          path: sessionsDir,
          scope: 'user',
          description: 'Codex session history'
        }
      ]
    })
  })
})
