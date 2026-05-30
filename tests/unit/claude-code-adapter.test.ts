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
        categories: ['instruction', 'capability', 'state', 'observability', 'integration'],
        kind: 'directory',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(mockHome.dir, '.claude.json'),
        scope: 'user',
        description: 'Claude Code global config file',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.claude'),
        scope: 'project',
        description: 'Project Claude Code directory',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.mcp.json'),
        scope: 'project',
        description: 'Project MCP config file',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      })
    ])
  })

  it('scans file-based managed settings and MCP sources', async () => {
    const managedDir = path.join(tempDir!, 'managed')
    fs.mkdirSync(managedDir, { recursive: true })
    fs.writeFileSync(
      path.join(managedDir, 'managed-settings.json'),
      JSON.stringify({
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'echo managed' }] }]
        },
        permissions: {
          allow: ['Bash(git status)']
        },
        env: {
          CLAUDE_CODE_ENABLE_TELEMETRY: '1'
        }
      })
    )
    fs.writeFileSync(
      path.join(managedDir, 'managed-mcp.json'),
      JSON.stringify({ mcpServers: { managed: { command: 'managed-mcp' } } })
    )

    const adapter = new ClaudeCodeAdapter(undefined, { managedDir })
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(managedDir, 'managed-settings.json'),
          scope: 'enterprise',
          description: 'Claude Code managed settings file',
          status: 'scanned'
        }),
        expect.objectContaining({
          path: path.join(managedDir, 'managed-mcp.json'),
          scope: 'enterprise',
          description: 'Claude Code managed MCP file',
          status: 'scanned'
        })
      ])
    )
    expect(result.assets.map((asset) => [asset.type, asset.scope, asset.name])).toEqual(
      expect.arrayContaining([
        ['hook', 'enterprise', 'echo managed'],
        ['permission', 'enterprise', 'allow-list'],
        ['env', 'enterprise', 'env'],
        ['mcp-server', 'enterprise', 'managed']
      ])
    )
  })
})
