import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createAgentAdapters,
  DeclaredAgentAdapter,
  ManifestAgentAdapter
} from '@berth/scan-engine/agent-plugins/adapter-registry'
import { GeminiCliAdapter } from '@berth/scan-engine/adapters/gemini-cli'
import { PLANNED_AGENT_ADAPTER_DEFINITIONS } from '@berth/scan-engine/adapters/planned-agent-definitions'
import {
  loadAgentPluginManifests,
  resetAgentPluginManifestCacheForTests
} from '@berth/scan-engine/agent-plugins/manifest'

const tempDirs: string[] = []

describe('agent adapter registry', () => {
  afterEach(() => {
    resetAgentPluginManifestCacheForTests()
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('registers read-only manifest adapters without executing adapter entrypoints', async () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const manifestPath = path.join(projectDir, '.berth', 'agent-plugins', 'example.json')
    const configPath = path.join(homeDir, '.example', 'config.json')
    fs.mkdirSync(path.dirname(configPath), { recursive: true })
    fs.writeFileSync(configPath, '{}', 'utf8')
    writeJson(manifestPath, pluginManifest({
      implementation: {
        kind: 'adapter',
        entrypoint: './adapter.js'
      }
    }))
    fs.writeFileSync(path.join(path.dirname(manifestPath), 'adapter.js'), 'throw new Error("executed")', 'utf8')

    const adapters = createAgentAdapters(projectDir, {
      homeDir,
      env: {},
      manifestPaths: [manifestPath]
    })
    const manifestAdapter = adapters.find((adapter) => adapter.id === 'example-agent')

    expect(manifestAdapter).toBeInstanceOf(ManifestAgentAdapter)
    await expect(manifestAdapter?.scanAll()).resolves.toMatchObject({
      assets: [
        expect.objectContaining({
          agentId: 'example-agent',
          type: 'plugin',
          scope: 'project',
          path: manifestPath,
          meta: expect.objectContaining({
            implementation: {
              kind: 'adapter',
              entrypoint: './adapter.js'
            }
          })
        })
      ],
      errors: []
    })
    await expect(manifestAdapter?.scanSourceCoverage()).resolves.toEqual([
      expect.objectContaining({
        path: configPath,
        status: 'scanned',
        code: 'example.user.config'
      })
    ])
    expect('scanAssets' in manifestAdapter!).toBe(false)
    expect('watchAssets' in manifestAdapter!).toBe(false)
    expect('resolveRelations' in manifestAdapter!).toBe(false)
  })

  it('does not register manifests blocked by write or execute permissions', () => {
    const dir = makeTempDir()
    const manifestPath = path.join(dir, 'blocked.json')
    writeJson(manifestPath, pluginManifest({
      permissions: [
        {
          kind: 'execute',
          scopes: ['user'],
          pathPatterns: ['example'],
          reason: 'Run adapter code.'
        }
      ]
    }))

    const adapters = createAgentAdapters(undefined, {
      homeDir: dir,
      env: {},
      manifestPaths: [manifestPath]
    })

    expect(adapters.map((adapter) => adapter.id)).not.toContain('example-agent')
  })

  it('marks project source descriptors as not scanned before a project is selected', async () => {
    const dir = makeTempDir()
    const manifestPath = path.join(dir, 'project.json')
    const [manifest] = loadAgentPluginManifests({
      manifestPaths: [manifestPath],
      homeDir: dir,
      env: {}
    })
    writeJson(manifestPath, pluginManifest({
      sourceDescriptors: [
        {
          code: 'example.project.config',
          scope: 'project',
          kind: 'file',
          categories: ['capability'],
          pathPattern: '<project>/.example/config.json'
        }
      ]
    }))
    const [nextManifest] = loadAgentPluginManifests({
      manifestPaths: [manifestPath],
      homeDir: dir,
      env: {}
    })

    expect(manifest?.status).toBe('invalid')
    const adapter = new ManifestAgentAdapter(nextManifest!)

    await expect(adapter.scanSourceCoverage()).resolves.toEqual([
      expect.objectContaining({
        path: '<project>/.example/config.json',
        status: 'not-scanned',
        reason: 'project-not-selected'
      })
    ])
  })

  it('registers planned agent definitions and parses stable Gemini CLI sources', async () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const geminiSettings = path.join(homeDir, '.gemini', 'settings.json')
    const geminiProjectSettings = path.join(projectDir, '.gemini', 'settings.json')
    const geminiUserContext = path.join(homeDir, '.gemini', 'GEMINI.md')
    const geminiProjectContext = path.join(projectDir, 'GEMINI.md')
    const geminiProjectAgents = path.join(projectDir, 'AGENTS.md')
    const geminiExtension = path.join(homeDir, '.gemini', 'extensions', 'helper', 'gemini-extension.json')
    const geminiSession = path.join(homeDir, '.gemini', 'tmp', 'session.json')
    const cursorRules = path.join(projectDir, '.cursor', 'rules')
    const opencodeProjectConfig = path.join(projectDir, 'opencode.json')
    fs.mkdirSync(path.dirname(geminiSettings), { recursive: true })
    writeJson(geminiSettings, {
      context: { fileName: 'GEMINI.md' },
      mcpServers: { docs: { command: 'docs-mcp' } }
    })
    writeJson(geminiProjectSettings, {
      context: { fileName: ['GEMINI.md', 'AGENTS.md'] },
      mcpServers: { repo: { command: 'repo-mcp' } }
    })
    fs.writeFileSync(geminiUserContext, 'User Gemini guidance.\n', 'utf8')
    fs.writeFileSync(geminiProjectContext, 'Project Gemini guidance.\n', 'utf8')
    fs.writeFileSync(geminiProjectAgents, 'Shared project guidance.\n', 'utf8')
    writeJson(geminiExtension, {
      name: 'helper',
      version: '1.2.3',
      description: 'Test extension',
      mcpServers: { helper: { command: 'helper-mcp' } }
    })
    fs.mkdirSync(path.dirname(geminiSession), { recursive: true })
    fs.writeFileSync(geminiSession, 'sensitive transcript', 'utf8')
    fs.mkdirSync(cursorRules, { recursive: true })
    fs.writeFileSync(path.join(cursorRules, 'rule.mdc'), 'Always test.', 'utf8')
    fs.writeFileSync(opencodeProjectConfig, '{}', 'utf8')

    const adapters = createAgentAdapters(projectDir, {
      homeDir,
      env: {},
      loadManifests: () => []
    })
    const planned = adapters.filter((adapter) =>
      PLANNED_AGENT_ADAPTER_DEFINITIONS.some((definition) => definition.id === adapter.id)
    )

    expect(planned).toHaveLength(6)
    expect(planned.filter((adapter) => adapter instanceof DeclaredAgentAdapter)).toHaveLength(5)

    const gemini = planned.find((adapter) => adapter.id === 'gemini-cli')!
    expect(gemini).toBeInstanceOf(GeminiCliAdapter)
    await expect(gemini.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'gemini.user.settings',
          path: geminiSettings,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'gemini.user.sessions',
          path: path.dirname(geminiSession),
          status: 'scanned',
          reason: 'sensitive-metadata-only'
        })
      ])
    })
    const geminiResult = await gemini.scanAll()
    expect(geminiResult.errors).toEqual([])
    expect(geminiResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'gemini-md',
          scope: 'user',
          path: geminiUserContext
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'gemini-md',
          scope: 'project',
          path: geminiProjectContext
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'gemini-md',
          scope: 'project',
          path: geminiProjectAgents
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: geminiSettings
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'mcp-server',
          scope: 'project',
          name: 'repo',
          path: geminiProjectSettings
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'plugin',
          scope: 'user',
          name: 'helper',
          path: path.dirname(geminiExtension),
          meta: expect.objectContaining({
            version: '1.2.3',
            origin: 'gemini-extension'
          })
        }),
        expect.objectContaining({
          agentId: 'gemini-cli',
          type: 'mcp-server',
          scope: 'user',
          name: 'helper',
          path: geminiExtension,
          meta: expect.objectContaining({
            origin: 'gemini-extension',
            pluginName: 'helper'
          })
        })
      ])
    )
    expect(geminiResult.assets.some((asset) => asset.type === 'session')).toBe(false)

    const cursor = planned.find((adapter) => adapter.id === 'cursor')!
    await expect(cursor.scanSourceCoverage()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'cursor.project.rules',
          path: cursorRules,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'cursor.user.ide-state',
          status: 'missing',
          reason: 'sensitive-metadata-only'
        })
      ])
    )

    const opencode = planned.find((adapter) => adapter.id === 'opencode')!
    await expect(opencode.scanRoots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'opencode.project.config',
          path: opencodeProjectConfig,
          status: 'scanned'
        })
      ])
    )
  })
})

function pluginManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'example-agent',
    displayName: 'Example Agent',
    version: '0.1.0',
    agentCompatibility: {
      agentId: 'example-agent',
      name: 'Example Agent',
      versionRange: '*'
    },
    permissions: [
      {
        kind: 'read',
        scopes: ['user'],
        pathPatterns: ['~/.example'],
        reason: 'Read local Example Agent configuration.'
      }
    ],
    sourceDescriptors: [
      {
        code: 'example.user.config',
        scope: 'user',
        kind: 'file',
        categories: ['capability'],
        pathPattern: '~/.example/config.json'
      }
    ],
    assetDescriptors: [
      {
        type: 'plugin',
        category: 'capability',
        scopes: ['user']
      }
    ],
    ...overrides
  }
}

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-agent-adapter-registry-'))
  tempDirs.push(dir)
  return dir
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}
