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

import { ClaudeCodeAdapter } from '../../src/main/adapters/claude-code'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(process.env['TEMP'] ?? process.cwd(), 'berth-claude-adapter-'))
  mockHome.dir = tempDir
})

afterEach(() => {
  vi.restoreAllMocks()
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe('ClaudeCodeAdapter', () => {
  it('reports broad data directories instead of narrow configuration-only labels', async () => {
    const projectDir = path.join(tempDir!, 'project')
    const claudeDir = path.join(mockHome.dir, '.claude')
    fs.mkdirSync(claudeDir, { recursive: true })
    fs.writeFileSync(path.join(mockHome.dir, '.claude.json'), '{}')
    fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true })
    fs.writeFileSync(path.join(projectDir, '.mcp.json'), '{}')

    const adapter = new ClaudeCodeAdapter(projectDir)

    await expect(adapter.scanRoots()).resolves.toEqual([
      expect.objectContaining({
        path: claudeDir,
        scope: 'user',
        description: 'Claude Code data directory',
        categories: ['instruction', 'capability', 'state', 'observability', 'integration']
      }),
      expect.objectContaining({
        path: path.join(mockHome.dir, '.claude.json'),
        scope: 'user',
        description: 'Claude Code global config file',
        categories: ['capability']
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.claude'),
        scope: 'project',
        description: 'Project Claude Code directory',
        categories: ['instruction', 'capability']
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.mcp.json'),
        scope: 'project',
        description: 'Project MCP config file',
        categories: ['capability']
      })
    ])
  })
})
