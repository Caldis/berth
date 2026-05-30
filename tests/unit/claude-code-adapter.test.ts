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
        code: 'claude.user.data-directory',
        categories: ['instruction', 'capability', 'state', 'observability', 'integration'],
        kind: 'directory',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(mockHome.dir, '.claude.json'),
        scope: 'user',
        code: 'claude.user.global-config',
        categories: ['capability'],
        kind: 'file',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.claude'),
        scope: 'project',
        code: 'claude.project.directory',
        categories: ['instruction', 'capability'],
        kind: 'directory',
        status: 'scanned'
      }),
      expect.objectContaining({
        path: path.join(projectDir, '.mcp.json'),
        scope: 'project',
        code: 'claude.project.mcp-config',
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
          code: 'claude.enterprise.managed-settings',
          status: 'scanned'
        }),
        expect.objectContaining({
          path: path.join(managedDir, 'managed-mcp.json'),
          scope: 'enterprise',
          code: 'claude.enterprise.managed-mcp',
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

  it('scans additional explicit Claude Code data directories', async () => {
    const extraClaudeDir = path.join(tempDir!, 'wsl-home', '.claude')
    fs.mkdirSync(extraClaudeDir, { recursive: true })
    fs.writeFileSync(path.join(extraClaudeDir, 'CLAUDE.md'), '# Extra Claude instructions\n')

    const adapter = new ClaudeCodeAdapter(undefined, {
      homeDir: mockHome.dir,
      env: { BERTH_EXTRA_CLAUDE_DIRS: extraClaudeDir }
    })
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: extraClaudeDir,
          status: 'scanned'
        })
      ])
    )
    expect(result.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'claude-md',
          path: path.join(extraClaudeDir, 'CLAUDE.md')
        })
      ])
    )
  })
})
