import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createAgentAdapters,
  DeclaredAgentAdapter,
  ManifestAgentAdapter
} from '@berth/scan-engine/agent-plugins/adapter-registry'
import { CursorAdapter } from '@berth/scan-engine/adapters/cursor'
import { GeminiCliAdapter } from '@berth/scan-engine/adapters/gemini-cli'
import { GitHubCopilotCliAdapter } from '@berth/scan-engine/adapters/github-copilot-cli'
import { HermesAgentAdapter } from '@berth/scan-engine/adapters/hermes-agent'
import { OpenClawAdapter } from '@berth/scan-engine/adapters/openclaw'
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

  it('does not treat shared compatibility files as installed third-party agents', async () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const projectAgents = path.join(projectDir, 'AGENTS.md')
    const projectClaude = path.join(projectDir, 'CLAUDE.md')
    const sharedSkill = path.join(homeDir, '.agents', 'skills', 'shared', 'SKILL.md')
    fs.writeFileSync(projectAgents, 'Shared project guidance.\n', 'utf8')
    fs.writeFileSync(projectClaude, 'Claude-compatible guidance.\n', 'utf8')
    fs.mkdirSync(path.dirname(sharedSkill), { recursive: true })
    fs.writeFileSync(sharedSkill, '---\nname: shared\n---\nShared skill.\n', 'utf8')

    const adapters = createAgentAdapters(projectDir, {
      homeDir,
      env: { HERMES_HOME: path.join(homeDir, 'missing-hermes') },
      loadManifests: () => []
    })

    const cursor = adapters.find((adapter) => adapter.id === 'cursor')!
    const copilot = adapters.find((adapter) => adapter.id === 'github-copilot-cli')!
    const opencode = adapters.find((adapter) => adapter.id === 'opencode')!
    const openclaw = adapters.find((adapter) => adapter.id === 'openclaw')!
    const hermes = adapters.find((adapter) => adapter.id === 'hermes-agent')!

    await expect(cursor.detect()).resolves.toMatchObject({
      installed: false,
      paths: expect.arrayContaining([
        expect.objectContaining({ code: 'cursor.project.agents-md', status: 'scanned' })
      ])
    })
    await expect(copilot.detect()).resolves.toMatchObject({
      installed: false,
      paths: expect.arrayContaining([
        expect.objectContaining({ code: 'copilot.user.shared-skills', status: 'scanned' }),
        expect.objectContaining({ code: 'copilot.project.agents-md', status: 'scanned' })
      ])
    })
    await expect(opencode.detect()).resolves.toMatchObject({
      installed: false,
      paths: expect.arrayContaining([
        expect.objectContaining({ code: 'opencode.project.agents-md', status: 'scanned' })
      ])
    })
    await expect(openclaw.detect()).resolves.toMatchObject({
      installed: false,
      paths: expect.arrayContaining([
        expect.objectContaining({ code: 'openclaw.user.shared-skills', status: 'scanned' })
      ])
    })
    await expect(hermes.detect()).resolves.toMatchObject({
      installed: false,
      paths: expect.arrayContaining([
        expect.objectContaining({ code: 'hermes.project.agents-md', status: 'scanned' }),
        expect.objectContaining({ code: 'hermes.project.claude-md', status: 'scanned' })
      ])
    })
  })

  it('uses CURSOR_CONFIG_DIR for both Cursor source coverage and parsing', async () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const cursorConfigDir = path.join(homeDir, 'custom-cursor-config')
    const cursorMcp = path.join(cursorConfigDir, 'mcp.json')
    const cursorSkill = path.join(cursorConfigDir, 'skills', 'review', 'SKILL.md')
    writeJson(cursorMcp, {
      mcpServers: {
        docs: {
          command: 'docs-mcp'
        }
      }
    })
    fs.mkdirSync(path.dirname(cursorSkill), { recursive: true })
    fs.writeFileSync(cursorSkill, '---\nname: review\n---\nReview code.\n', 'utf8')

    const cursorDefinition = PLANNED_AGENT_ADAPTER_DEFINITIONS.find((definition) => definition.id === 'cursor')!
    const adapter = new CursorAdapter(cursorDefinition, {
      homeDir,
      projectDir,
      env: { CURSOR_CONFIG_DIR: cursorConfigDir }
    })

    await expect(adapter.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'cursor.user.mcp',
          path: cursorMcp,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'cursor.user.skills',
          path: path.join(cursorConfigDir, 'skills'),
          status: 'scanned'
        })
      ])
    })
    await expect(adapter.scanAll()).resolves.toMatchObject({
      assets: expect.arrayContaining([
        expect.objectContaining({
          agentId: 'cursor',
          type: 'mcp-server',
          name: 'docs',
          path: cursorMcp
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'skill',
          name: 'review',
          path: cursorSkill
        })
      ]),
      errors: []
    })
  })

  it('uses agent-specific home env roots for source coverage and parsing', async () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const copilotHome = path.join(homeDir, 'copilot-home')
    const copilotMcp = path.join(copilotHome, 'mcp-config.json')
    const opencodeConfigDir = path.join(homeDir, 'opencode-config')
    const opencodeConfig = path.join(opencodeConfigDir, 'opencode.json')
    const opencodeDataHome = path.join(homeDir, 'opencode-data-home')
    const opencodeAuth = path.join(opencodeDataHome, 'opencode', 'auth.json')
    const openClawState = path.join(homeDir, 'openclaw-state')
    const openClawConfig = path.join(openClawState, 'openclaw.json')

    writeJson(copilotMcp, {
      mcpServers: {
        docs: {
          command: 'docs-mcp'
        }
      }
    })
    writeJson(opencodeConfig, {
      mcp: {
        docs: {
          command: 'docs-mcp'
        }
      }
    })
    writeJson(opencodeAuth, { token: 'secret' })
    writeJson(openClawConfig, {
      mcpServers: {
        docs: {
          command: 'docs-mcp'
        }
      }
    })

    const copilot = new GitHubCopilotCliAdapter(definitionFor('github-copilot-cli'), {
      homeDir,
      projectDir,
      env: { COPILOT_HOME: copilotHome }
    })
    const opencode = new OpenCodeAdapter(definitionFor('opencode'), {
      homeDir,
      projectDir,
      env: { OPENCODE_CONFIG_DIR: opencodeConfigDir, XDG_DATA_HOME: opencodeDataHome }
    })
    const openclaw = new OpenClawAdapter(definitionFor('openclaw'), {
      homeDir,
      projectDir,
      env: { OPENCLAW_STATE_DIR: openClawState }
    })

    await expect(copilot.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'copilot.user.mcp-config',
          path: copilotMcp,
          status: 'scanned'
        })
      ])
    })
    await expect(copilot.scanAll()).resolves.toMatchObject({
      assets: expect.arrayContaining([
        expect.objectContaining({ agentId: 'github-copilot-cli', type: 'mcp-server', name: 'docs', path: copilotMcp })
      ]),
      errors: []
    })

    await expect(opencode.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'opencode.user.config',
          path: opencodeConfig,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'opencode.user.auth',
          path: opencodeAuth,
          status: 'scanned'
        })
      ])
    })
    await expect(opencode.scanAll()).resolves.toMatchObject({
      assets: expect.arrayContaining([
        expect.objectContaining({ agentId: 'opencode', type: 'mcp-server', name: 'docs', path: opencodeConfig }),
        expect.objectContaining({ agentId: 'opencode', type: 'credential', path: opencodeAuth })
      ]),
      errors: []
    })

    await expect(openclaw.detect()).resolves.toMatchObject({
      installed: true,
      paths: expect.arrayContaining([
        expect.objectContaining({
          code: 'openclaw.user.config',
          path: openClawConfig,
          status: 'scanned'
        })
      ])
    })
    await expect(openclaw.scanAll()).resolves.toMatchObject({
      assets: expect.arrayContaining([
        expect.objectContaining({ agentId: 'openclaw', type: 'mcp-server', name: 'docs', path: openClawConfig })
      ]),
      errors: []
    })
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
    const cursorProjectMcp = path.join(projectDir, '.cursor', 'mcp.json')
    const cursorProjectHooks = path.join(projectDir, '.cursor', 'hooks.json')
    const cursorProjectPermissions = path.join(projectDir, '.cursor', 'permissions.json')
    const cursorProjectSandbox = path.join(projectDir, '.cursor', 'sandbox.json')
    const cursorProjectSkill = path.join(projectDir, '.cursor', 'skills', 'ui-helper', 'SKILL.md')
    const cursorProjectAgent = path.join(projectDir, '.cursor', 'agents', 'reviewer.md')
    const cursorProjectCommand = path.join(projectDir, '.cursor', 'commands', 'test.md')
    const cursorProjectPlugin = path.join(projectDir, '.cursor', 'plugins', 'helper', 'plugin.json')
    const cursorUserMcp = path.join(homeDir, '.cursor', 'mcp.json')
    const cursorUserSkill = path.join(homeDir, '.cursor', 'skills', 'global-helper', 'SKILL.md')
    const cursorUserAgent = path.join(homeDir, '.cursor', 'agents', 'planner.md')
    const opencodeProjectConfig = path.join(projectDir, 'opencode.json')
    const opencodeUserConfig = path.join(homeDir, '.config', 'opencode', 'opencode.jsonc')
    const opencodeProjectCommand = path.join(projectDir, '.opencode', 'commands', 'build.md')
    const opencodeProjectAgent = path.join(projectDir, '.opencode', 'agents', 'reviewer.md')
    const opencodeProjectSkill = path.join(projectDir, '.opencode', 'skills', 'lint', 'SKILL.md')
    const opencodeProjectPlugin = path.join(projectDir, '.opencode', 'plugins', 'helper', 'plugin.json')
    const opencodeAuth = path.join(homeDir, '.local', 'share', 'opencode', 'auth.json')
    const openClawConfig = path.join(homeDir, '.openclaw', 'openclaw.json')
    const openClawWorkspaceAgents = path.join(homeDir, '.openclaw', 'workspace', 'AGENTS.md')
    const openClawWorkspaceSkill = path.join(homeDir, '.openclaw', 'workspace', 'skills', 'release', 'SKILL.md')
    const openClawSharedSkill = path.join(homeDir, '.agents', 'skills', 'openclaw-shared', 'SKILL.md')
    const openClawExtension = path.join(homeDir, '.openclaw', 'extensions', 'helper', 'openclaw.plugin.json')
    const openClawSessions = path.join(homeDir, '.openclaw', 'agents', 'default', 'sessions', 'sessions.json')
    const openClawSecrets = path.join(homeDir, '.openclaw', 'secrets.json')
    const openClawAuthProfiles = path.join(homeDir, '.openclaw', 'agents', 'default', 'agent', 'auth-profiles.json')
    const hermesHome = path.join(homeDir, '.hermes-fixture')
    const hermesConfig = path.join(hermesHome, 'config.yaml')
    const hermesSoul = path.join(hermesHome, 'SOUL.md')
    const hermesSkill = path.join(hermesHome, 'skills', 'release', 'SKILL.md')
    const hermesPlugin = path.join(hermesHome, 'plugins', 'helper', 'plugin.yaml')
    const hermesHook = path.join(hermesHome, 'hooks', 'notify', 'HOOK.yaml')
    const hermesSessions = path.join(hermesHome, 'sessions', 'sessions.json')
    const hermesEnv = path.join(hermesHome, '.env')
    const hermesAuth = path.join(hermesHome, 'auth.json')
    const hermesProjectContext = path.join(projectDir, 'HERMES.md')
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
    fs.writeFileSync(path.join(cursorRules, 'rule.mdc'), '---\ndescription: Test rule\n---\nAlways test.', 'utf8')
    writeJson(cursorProjectMcp, {
      mcpServers: {
        repo: {
          command: 'repo-mcp',
          env: { API_KEY: 'secret' }
        }
      }
    })
    writeJson(cursorProjectHooks, { hooks: { beforeShell: { command: 'echo ok' } } })
    writeJson(cursorProjectPermissions, { allow: ['Shell(ls)'], token: 'secret' })
    writeJson(cursorProjectSandbox, { mode: 'workspace-write', secret: 'hidden' })
    fs.mkdirSync(path.dirname(cursorProjectSkill), { recursive: true })
    fs.writeFileSync(cursorProjectSkill, '---\nname: ui-helper\n---\nBuild UI.\n', 'utf8')
    fs.mkdirSync(path.dirname(cursorProjectAgent), { recursive: true })
    fs.writeFileSync(cursorProjectAgent, '---\nname: reviewer\n---\nReview code.\n', 'utf8')
    fs.mkdirSync(path.dirname(cursorProjectCommand), { recursive: true })
    fs.writeFileSync(cursorProjectCommand, '---\nname: test\n---\nRun tests.\n', 'utf8')
    writeJson(cursorProjectPlugin, { name: 'helper', version: '0.3.0', description: 'Cursor helper' })
    writeJson(cursorUserMcp, { servers: { docs: { command: 'docs-mcp', token: 'secret' } } })
    fs.mkdirSync(path.dirname(cursorUserSkill), { recursive: true })
    fs.writeFileSync(cursorUserSkill, '---\nname: global-helper\n---\nGlobal skill.\n', 'utf8')
    fs.mkdirSync(path.dirname(cursorUserAgent), { recursive: true })
    fs.writeFileSync(cursorUserAgent, '---\nname: planner\n---\nPlan work.\n', 'utf8')
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
    writeJson(openClawConfig, {
      mcpServers: {
        docs: {
          command: 'docs-mcp',
          env: { API_TOKEN: 'secret' }
        }
      }
    })
    fs.mkdirSync(path.dirname(openClawWorkspaceAgents), { recursive: true })
    fs.writeFileSync(openClawWorkspaceAgents, 'OpenClaw workspace guidance.\n', 'utf8')
    fs.mkdirSync(path.dirname(openClawWorkspaceSkill), { recursive: true })
    fs.writeFileSync(openClawWorkspaceSkill, '---\nname: release\n---\nRelease helper.\n', 'utf8')
    fs.mkdirSync(path.dirname(openClawSharedSkill), { recursive: true })
    fs.writeFileSync(openClawSharedSkill, '---\nname: openclaw-shared\n---\nShared helper.\n', 'utf8')
    writeJson(openClawExtension, {
      name: 'helper',
      version: '0.4.0',
      description: 'OpenClaw helper',
      mcpServers: {
        helper: {
          command: 'helper-mcp',
          token: 'secret'
        }
      }
    })
    writeJson(openClawSessions, {
      sessions: [
        {
          id: 'session-1',
          createdAt: '2026-06-13T00:00:00.000Z',
          updatedAt: '2026-06-13T00:10:00.000Z',
          tokenCount: 123
        }
      ]
    })
    writeJson(openClawSecrets, { token: 'secret' })
    writeJson(openClawAuthProfiles, { github: { accessToken: 'secret' } })
    fs.mkdirSync(path.dirname(hermesConfig), { recursive: true })
    fs.writeFileSync(hermesConfig, [
      'mcp_servers:',
      '  docs:',
      '    command: docs-mcp',
      '    env:',
      '      API_TOKEN: secret',
      'hooks:',
      '  before_tool:',
      '    command: echo ok',
      '    token: secret',
      ''
    ].join('\n'), 'utf8')
    fs.writeFileSync(hermesSoul, 'Hermes identity.\n', 'utf8')
    fs.mkdirSync(path.dirname(hermesSkill), { recursive: true })
    fs.writeFileSync(hermesSkill, '---\nname: release\n---\nRelease helper.\n', 'utf8')
    fs.mkdirSync(path.dirname(hermesPlugin), { recursive: true })
    fs.writeFileSync(hermesPlugin, 'name: helper\nversion: 0.5.0\ndescription: Hermes helper\n', 'utf8')
    fs.mkdirSync(path.dirname(hermesHook), { recursive: true })
    fs.writeFileSync(hermesHook, 'name: notify\ncommand: echo ok\ntoken: secret\n', 'utf8')
    writeJson(hermesSessions, {
      sessions: [
        {
          id: 'session-1',
          createdAt: '2026-06-13T01:00:00.000Z',
          updatedAt: '2026-06-13T01:10:00.000Z',
          tokenCount: 456
        }
      ]
    })
    fs.writeFileSync(hermesEnv, 'HERMES_TOKEN=secret\n', 'utf8')
    writeJson(hermesAuth, { github: { accessToken: 'secret' } })
    fs.writeFileSync(hermesProjectContext, 'Project Hermes guidance.\n', 'utf8')

    const adapters = createAgentAdapters(projectDir, {
      homeDir,
      env: { HERMES_HOME: hermesHome },
      loadManifests: () => []
    })
    const planned = adapters.filter((adapter) =>
      PLANNED_AGENT_ADAPTER_DEFINITIONS.some((definition) => definition.id === adapter.id)
    )

    expect(planned).toHaveLength(6)
    expect(planned.filter((adapter) => adapter instanceof DeclaredAgentAdapter)).toHaveLength(0)

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
    expect(cursor).toBeInstanceOf(CursorAdapter)
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
    const cursorResult = await cursor.scanAll()
    expect(cursorResult.errors).toEqual([])
    expect(cursorResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'cursor',
          type: 'agents-md',
          scope: 'project',
          path: path.join(cursorRules, 'rule.mdc')
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'agents-md',
          scope: 'project',
          path: path.join(projectDir, 'AGENTS.md'),
          meta: expect.objectContaining({
            readByAgentIds: ['cursor']
          })
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'skill',
          scope: 'user',
          name: 'global-helper',
          path: cursorUserSkill
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'skill',
          scope: 'project',
          name: 'ui-helper',
          path: cursorProjectSkill
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'agent',
          scope: 'user',
          name: 'planner',
          path: cursorUserAgent
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'agent',
          scope: 'project',
          name: 'reviewer',
          path: cursorProjectAgent
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'command',
          scope: 'project',
          name: 'test',
          path: cursorProjectCommand
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: cursorUserMcp,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              token: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'mcp-server',
          scope: 'project',
          name: 'repo',
          path: cursorProjectMcp,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              env: { API_KEY: '<redacted>' }
            })
          })
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'hook',
          scope: 'project',
          name: 'beforeShell',
          path: cursorProjectHooks
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'permission',
          scope: 'project',
          name: 'permissions',
          path: cursorProjectPermissions,
          meta: expect.objectContaining({
            config: expect.objectContaining({
              token: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'permission',
          scope: 'project',
          name: 'sandbox',
          path: cursorProjectSandbox,
          meta: expect.objectContaining({
            config: expect.objectContaining({
              secret: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'cursor',
          type: 'plugin',
          scope: 'project',
          name: 'helper',
          path: path.dirname(cursorProjectPlugin)
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

    const openclaw = planned.find((adapter) => adapter.id === 'openclaw')!
    expect(openclaw).toBeInstanceOf(OpenClawAdapter)
    await expect(openclaw.scanSourceCoverage()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'openclaw.user.config',
          path: openClawConfig,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'openclaw.user.sessions-index',
          path: openClawSessions,
          status: 'scanned',
          reason: 'sensitive-metadata-only'
        })
      ])
    )
    const openClawResult = await openclaw.scanAll()
    expect(openClawResult.errors).toEqual([])
    expect(openClawResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'agents-md',
          scope: 'user',
          path: openClawWorkspaceAgents
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'skill',
          scope: 'user',
          name: 'release',
          path: openClawWorkspaceSkill
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'skill',
          scope: 'user',
          name: 'openclaw-shared',
          path: openClawSharedSkill
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: openClawConfig,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              env: { API_TOKEN: '<redacted>' }
            })
          })
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'plugin',
          scope: 'user',
          name: 'helper',
          path: path.dirname(openClawExtension)
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'mcp-server',
          scope: 'user',
          name: 'helper',
          path: openClawExtension,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              token: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'session',
          scope: 'session',
          name: 'session-1',
          path: openClawSessions,
          sensitive: true
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'credential',
          scope: 'user',
          path: openClawSecrets,
          sensitive: true
        }),
        expect.objectContaining({
          agentId: 'openclaw',
          type: 'credential',
          scope: 'user',
          path: openClawAuthProfiles,
          sensitive: true
        })
      ])
    )

    const hermes = planned.find((adapter) => adapter.id === 'hermes-agent')!
    expect(hermes).toBeInstanceOf(HermesAgentAdapter)
    await expect(hermes.scanSourceCoverage()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'hermes.user.config',
          path: hermesConfig,
          status: 'scanned'
        }),
        expect.objectContaining({
          code: 'hermes.user.sessions-index',
          path: hermesSessions,
          status: 'scanned',
          reason: 'sensitive-metadata-only'
        }),
        expect.objectContaining({
          code: 'hermes.project.hermes-root-md',
          path: hermesProjectContext,
          status: 'scanned'
        })
      ])
    )
    const hermesResult = await hermes.scanAll()
    expect(hermesResult.errors).toEqual([])
    expect(hermesResult.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'agents-md',
          scope: 'user',
          path: hermesSoul
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'agents-md',
          scope: 'project',
          path: hermesProjectContext
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'agents-md',
          scope: 'project',
          path: path.join(projectDir, 'AGENTS.md'),
          meta: expect.objectContaining({
            readByAgentIds: ['hermes-agent']
          })
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'skill',
          scope: 'user',
          name: 'release',
          path: hermesSkill
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'mcp-server',
          scope: 'user',
          name: 'docs',
          path: hermesConfig,
          meta: expect.objectContaining({
            serverConfig: expect.objectContaining({
              env: { API_TOKEN: '<redacted>' }
            })
          })
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'hook',
          scope: 'user',
          name: 'before_tool',
          path: hermesConfig,
          meta: expect.objectContaining({
            hook: expect.objectContaining({
              token: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'plugin',
          scope: 'user',
          name: 'helper',
          path: path.dirname(hermesPlugin)
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'hook',
          scope: 'user',
          name: 'notify',
          path: hermesHook,
          meta: expect.objectContaining({
            hook: expect.objectContaining({
              token: '<redacted>'
            })
          })
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'session',
          scope: 'session',
          name: 'session-1',
          path: hermesSessions,
          sensitive: true
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'credential',
          scope: 'user',
          path: hermesEnv,
          sensitive: true
        }),
        expect.objectContaining({
          agentId: 'hermes-agent',
          type: 'credential',
          scope: 'user',
          path: hermesAuth,
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

function definitionFor(id: string) {
  const definition = PLANNED_AGENT_ADAPTER_DEFINITIONS.find((item) => item.id === id)
  if (!definition) throw new Error(`Missing planned adapter definition: ${id}`)
  return definition
}
