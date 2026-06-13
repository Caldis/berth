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
import { GitHubCopilotCliAdapter } from '@berth/scan-engine/adapters/github-copilot-cli'
import { OpenCodeAdapter } from '@berth/scan-engine/adapters/opencode'
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
    const copilotSettings = path.join(homeDir, '.copilot', 'settings.json')
    const copilotMcp = path.join(homeDir, '.copilot', 'mcp-config.json')
    const copilotInstructions = path.join(homeDir, '.copilot', 'copilot-instructions.md')
    const copilotAgent = path.join(homeDir, '.copilot', 'agents', 'reviewer.agent.md')
    const copilotSkill = path.join(homeDir, '.copilot', 'skills', 'release-helper', 'SKILL.md')
    const copilotProjectInstructions = path.join(projectDir, '.github', 'copilot-instructions.md')
    const copilotProjectPathInstructions = path.join(projectDir, '.github', 'instructions', 'tests.instructions.md')
    const copilotProjectSkill = path.join(projectDir, '.github', 'skills', 'ci-helper', 'SKILL.md')
    const copilotProjectSharedSkill = path.join(projectDir, '.agents', 'skills', 'shared-helper', 'SKILL.md')
    const copilotProjectMcp = path.join(projectDir, '.github', 'mcp.json')
    const copilotProjectAgents = path.join(projectDir, 'AGENTS.md')
    const copilotPlugin = path.join(homeDir, '.copilot', 'installed-plugins', '_direct', 'helper', 'package.json')
    const copilotHook = path.join(homeDir, '.copilot', 'hooks', 'pre-commit.ps1')
    const copilotConfig = path.join(homeDir, '.copilot', 'config.json')
    const cursorRules = path.join(projectDir, '.cursor', 'rules')
    const opencodeProjectConfig = path.join(projectDir, 'opencode.json')
    const opencodeUserConfig = path.join(homeDir, '.config', 'opencode', 'opencode.jsonc')
    const opencodeProjectCommand = path.join(projectDir, '.opencode', 'commands', 'build.md')
    const opencodeProjectAgent = path.join(projectDir, '.opencode', 'agents', 'reviewer.md')
    const opencodeProjectSkill = path.join(projectDir, '.opencode', 'skills', 'lint', 'SKILL.md')
    const opencodeProjectPlugin = path.join(projectDir, '.opencode', 'plugins', 'helper', 'plugin.json')
    const opencodeAuth = path.join(homeDir, '.local', 'share', 'opencode', 'auth.json')
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
    fs.mkdirSync(path.dirname(copilotSettings), { recursive: true })
    fs.writeFileSync(copilotSettings, '{\n  // JSONC settings\n  "hooks": { "pre-edit": { "command": "echo ok" } }\n}', 'utf8')
    writeJson(copilotMcp, {
      mcpServers: {
        docs: {
          type: 'local',
          command: 'docs-mcp',
          env: { API_KEY: 'secret' }
        }
      }
    })
    fs.writeFileSync(copilotInstructions, 'Personal Copilot guidance.\n', 'utf8')
    fs.mkdirSync(path.dirname(copilotAgent), { recursive: true })
    fs.writeFileSync(copilotAgent, '---\nname: reviewer\n---\nReview code.\n', 'utf8')
    fs.mkdirSync(path.dirname(copilotSkill), { recursive: true })
    fs.writeFileSync(copilotSkill, '---\nname: release-helper\ndescription: Help releases.\n---\nBody', 'utf8')
    fs.mkdirSync(path.dirname(copilotProjectInstructions), { recursive: true })
    fs.writeFileSync(copilotProjectInstructions, 'Project Copilot guidance.\n', 'utf8')
    fs.mkdirSync(path.dirname(copilotProjectPathInstructions), { recursive: true })
    fs.writeFileSync(copilotProjectPathInstructions, '---\napplyTo: "**/*.test.ts"\n---\nTest guidance.\n', 'utf8')
    fs.mkdirSync(path.dirname(copilotProjectSkill), { recursive: true })
    fs.writeFileSync(copilotProjectSkill, '---\nname: ci-helper\ndescription: Help CI.\n---\nBody', 'utf8')
    fs.mkdirSync(path.dirname(copilotProjectSharedSkill), { recursive: true })
    fs.writeFileSync(copilotProjectSharedSkill, '---\nname: shared-helper\ndescription: Shared helper.\n---\nBody', 'utf8')
    writeJson(copilotProjectMcp, { mcpServers: { repo: { type: 'local', command: 'repo-mcp' } } })
    fs.writeFileSync(copilotProjectAgents, 'Shared project guidance.\n', 'utf8')
    writeJson(copilotPlugin, { name: 'helper', version: '1.0.0', description: 'Copilot helper' })
    fs.mkdirSync(path.dirname(copilotHook), { recursive: true })
    fs.writeFileSync(copilotHook, 'Write-Output ok\n', 'utf8')
    writeJson(copilotConfig, { loggedInUsers: [{ id: 'secret' }] })
    fs.mkdirSync(cursorRules, { recursive: true })
    fs.writeFileSync(path.join(cursorRules, 'rule.mdc'), 'Always test.', 'utf8')
    fs.mkdirSync(path.dirname(opencodeUserConfig), { recursive: true })
    fs.writeFileSync(opencodeUserConfig, '{\n  // JSONC config\n  "mcp": { "docs": { "command": "docs-mcp" } }\n}', 'utf8')
    writeJson(opencodeProjectConfig, {
      mcp: { repo: { command: 'repo-mcp' } },
      agent: { build: { model: 'anthropic/claude-sonnet-4-5' } },
      command: { test: { template: 'Run tests' } }
    })
    fs.mkdirSync(path.dirname(opencodeProjectCommand), { recursive: true })
    fs.writeFileSync(opencodeProjectCommand, '---\ndescription: Build project\n---\nRun build.\n', 'utf8')
    fs.mkdirSync(path.dirname(opencodeProjectAgent), { recursive: true })
    fs.writeFileSync(opencodeProjectAgent, '---\nname: reviewer\n---\nReview code.\n', 'utf8')
    fs.mkdirSync(path.dirname(opencodeProjectSkill), { recursive: true })
    fs.writeFileSync(opencodeProjectSkill, '---\nname: lint\n---\nRun lint.\n', 'utf8')
    writeJson(opencodeProjectPlugin, {
      name: 'helper',
      version: '0.2.0',
      description: 'OpenCode helper'
    })
    writeJson(opencodeAuth, { token: 'secret' })

    const adapters = createAgentAdapters(projectDir, {
      homeDir,
      env: {},
      loadManifests: () => []
    })
    const planned = adapters.filter((adapter) =>
      PLANNED_AGENT_ADAPTER_DEFINITIONS.some((definition) => definition.id === adapter.id)
    )

    expect(planned).toHaveLength(6)
    expect(planned.filter((adapter) => adapter instanceof DeclaredAgentAdapter)).toHaveLength(3)

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

    const copilot = planned.find((adapter) => adapter.id === 'github-copilot-cli')!
    expect(copilot).toBeInstanceOf(GitHubCopilotCliAdapter)
    await expect(copilot.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'copilot.user.home',
          path: path.join(homeDir, '.copilot'),
          status: 'scanned'
        })
      ])
    })
    await expect(copilot.scanSourceCoverage?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'copilot.user.sessions',
          status: 'missing',
          reason: 'sensitive-metadata-only'
        })
      ])
    )
    const copilotResult = await copilot.scanAll()
    expect(copilotResult.errors).toEqual([])
    expect(copilotResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'agents-md',
          scope: 'user',
          path: copilotInstructions
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'agents-md',
          scope: 'project',
          path: copilotProjectInstructions
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'agents-md',
          scope: 'project',
          path: copilotProjectAgents,
          meta: expect.objectContaining({
            readByAgentIds: ['github-copilot-cli']
          })
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'agent',
          scope: 'user',
          name: 'reviewer',
          path: copilotAgent
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'skill',
          scope: 'user',
          name: 'release-helper',
          path: copilotSkill
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'skill',
          scope: 'project',
          name: 'ci-helper',
          path: copilotProjectSkill
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'skill',
          scope: 'project',
          name: 'shared-helper',
          path: copilotProjectSharedSkill
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: copilotMcp,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              env: { API_KEY: '<redacted>' }
            })
          })
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'mcp-server',
          scope: 'project',
          name: 'repo',
          path: copilotProjectMcp
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'hook',
          scope: 'user',
          name: 'pre-edit',
          path: copilotSettings
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'hook',
          scope: 'user',
          name: 'pre-commit',
          path: copilotHook
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'plugin',
          scope: 'user',
          name: 'helper',
          path: path.dirname(copilotPlugin)
        }),
        expect.objectContaining({
          agentId: 'github-copilot-cli',
          type: 'credential',
          scope: 'user',
          path: copilotConfig,
          sensitive: true
        })
      ])
    )
    expect(copilotResult.assets.some((asset) => asset.type === 'session')).toBe(false)

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
    expect(opencode).toBeInstanceOf(OpenCodeAdapter)
    await expect(opencode.scanRoots()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'opencode.project.config',
          path: opencodeProjectConfig,
          status: 'scanned'
        })
      ])
    )
    const opencodeResult = await opencode.scanAll()
    expect(opencodeResult.errors).toEqual([])
    expect(opencodeResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'opencode',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: opencodeUserConfig
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'mcp-server',
          scope: 'project',
          name: 'repo',
          path: opencodeProjectConfig
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'command',
          scope: 'project',
          name: 'test',
          path: opencodeProjectConfig
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'command',
          scope: 'project',
          name: 'build',
          path: opencodeProjectCommand
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'agent',
          scope: 'project',
          name: 'reviewer',
          path: opencodeProjectAgent
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'skill',
          scope: 'project',
          name: 'lint',
          path: opencodeProjectSkill
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'plugin',
          scope: 'project',
          name: 'helper',
          path: path.dirname(opencodeProjectPlugin)
        }),
        expect.objectContaining({
          agentId: 'opencode',
          type: 'credential',
          scope: 'user',
          path: opencodeAuth,
          sensitive: true
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
