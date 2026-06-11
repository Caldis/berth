import * as fs from 'fs'
import * as os from 'os'
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

import { CodexAdapter } from '@berth/scan-engine/adapters/codex'

let tempDir: string | null = null

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-codex-adapter-'))
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
          code: 'codex.user.sessions',
          categories: ['state'],
          kind: 'directory',
          status: 'scanned'
        }
      ]
    })
  })

  it('scans Codex user and project instructions and capabilities', async () => {
    const projectDir = path.join(tempDir!, 'project')
    const codexDir = path.join(mockHome.dir, '.codex')
    fs.mkdirSync(path.join(codexDir, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(codexDir, 'skills', 'codex-skill'), { recursive: true })
    fs.mkdirSync(path.join(mockHome.dir, '.agents', 'skills', 'user-skill'), { recursive: true })
    fs.mkdirSync(path.join(projectDir, '.codex', 'agents'), { recursive: true })
    fs.mkdirSync(path.join(projectDir, '.agents', 'skills', 'project-skill'), { recursive: true })

    fs.writeFileSync(path.join(codexDir, 'AGENTS.md'), '# User agents\n')
    fs.writeFileSync(
      path.join(codexDir, 'config.toml'),
      ['[mcp_servers.user]', 'command = "user-mcp"'].join('\n')
    )
    fs.writeFileSync(
      path.join(codexDir, 'hooks.json'),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }] } })
    )
    fs.writeFileSync(
      path.join(codexDir, 'agents', 'reviewer.toml'),
      [
        'name = "reviewer"',
        'description = "Reviews code."',
        'developer_instructions = "Check behavior."'
      ].join('\n')
    )
    fs.writeFileSync(
      path.join(codexDir, 'skills', 'codex-skill', 'SKILL.md'),
      ['---', 'name: codex-skill', 'description: Codex home skill', '---', 'Body'].join('\n')
    )
    fs.writeFileSync(
      path.join(mockHome.dir, '.agents', 'skills', 'user-skill', 'SKILL.md'),
      ['---', 'name: user-skill', 'description: User skill', '---', 'Body'].join('\n')
    )

    fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), '# Project agents\n')
    fs.writeFileSync(
      path.join(projectDir, '.codex', 'config.toml'),
      ['[mcp_servers.project]', 'command = "project-mcp"'].join('\n')
    )
    fs.writeFileSync(
      path.join(projectDir, '.codex', 'agents', 'mapper.toml'),
      [
        'name = "mapper"',
        'description = "Maps code."',
        'developer_instructions = "Read only."'
      ].join('\n')
    )
    fs.writeFileSync(
      path.join(projectDir, '.agents', 'skills', 'project-skill', 'SKILL.md'),
      ['---', 'name: project-skill', 'description: Project skill', '---', 'Body'].join('\n')
    )

    const adapter = new CodexAdapter(projectDir)
    const result = await adapter.scanAll()

    expect(result.errors).toEqual([])
    expect(result.assets.map((asset) => [asset.agentId, asset.type, asset.scope, asset.name])).toEqual(
      expect.arrayContaining([
        ['codex', 'agents-md', 'user', 'AGENTS.md'],
        ['codex', 'agents-md', 'project', 'AGENTS.md'],
        ['codex', 'mcp-server', 'user', 'user'],
        ['codex', 'mcp-server', 'project', 'project'],
        ['codex', 'hook', 'user', 'echo stop'],
        ['codex', 'agent', 'user', 'reviewer'],
        ['codex', 'agent', 'project', 'mapper'],
        ['codex', 'skill', 'user', 'codex-skill'],
        ['codex', 'skill', 'user', 'user-skill'],
        ['codex', 'skill', 'project', 'project-skill']
      ])
    )
  })

  it('scans project Codex sources from parent project roots', async () => {
    const repoDir = path.join(tempDir!, 'repo')
    const cwd = path.join(repoDir, 'packages', 'app')
    const codexDir = path.join(mockHome.dir, '.codex')
    const projectCodexDir = path.join(repoDir, '.codex')
    const projectSkillsDir = path.join(repoDir, '.agents', 'skills', 'project-skill')
    fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true })
    fs.mkdirSync(path.join(projectCodexDir, 'agents'), { recursive: true })
    fs.mkdirSync(projectSkillsDir, { recursive: true })
    fs.mkdirSync(cwd, { recursive: true })
    fs.mkdirSync(codexDir, { recursive: true })

    fs.writeFileSync(path.join(repoDir, 'AGENTS.md'), '# Repo agents\n')
    fs.writeFileSync(
      path.join(projectCodexDir, 'config.toml'),
      ['[mcp_servers.project]', 'command = "project-mcp"'].join('\n')
    )
    fs.writeFileSync(
      path.join(projectCodexDir, 'hooks.json'),
      JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo project-stop' }] }] } })
    )
    fs.writeFileSync(
      path.join(projectCodexDir, 'agents', 'mapper.toml'),
      [
        'name = "mapper"',
        'description = "Maps code."',
        'developer_instructions = "Read only."'
      ].join('\n')
    )
    fs.writeFileSync(
      path.join(projectSkillsDir, 'SKILL.md'),
      ['---', 'name: project-skill', 'description: Project skill', '---', 'Body'].join('\n')
    )

    const adapter = new CodexAdapter(cwd)
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(repoDir, 'AGENTS.md'),
          scope: 'project',
          code: 'codex.project.agents-md'
        }),
        expect.objectContaining({
          path: path.join(projectCodexDir, 'config.toml'),
          scope: 'project',
          code: 'codex.project.config'
        }),
        expect.objectContaining({
          path: path.join(projectCodexDir, 'hooks.json'),
          scope: 'project',
          code: 'codex.project.hooks'
        }),
        expect.objectContaining({
          path: path.join(projectCodexDir, 'agents'),
          scope: 'project',
          code: 'codex.project.agents-directory'
        }),
        expect.objectContaining({
          path: path.join(repoDir, '.agents', 'skills'),
          scope: 'project',
          code: 'codex.project.skills'
        })
      ])
    )
    expect(result.assets.map((asset) => [asset.type, asset.scope, asset.name, asset.path])).toEqual(
      expect.arrayContaining([
        ['agents-md', 'project', 'AGENTS.md', path.join(repoDir, 'AGENTS.md')],
        ['mcp-server', 'project', 'project', path.join(projectCodexDir, 'config.toml')],
        ['hook', 'project', 'echo project-stop', path.join(projectCodexDir, 'hooks.json')],
        ['agent', 'project', 'mapper', path.join(projectCodexDir, 'agents', 'mapper.toml')],
        ['skill', 'project', 'project-skill', path.join(projectSkillsDir, 'SKILL.md')]
      ])
    )
  })

  it('uses CODEX_HOME for user Codex sources when configured', async () => {
    const defaultCodexDir = path.join(mockHome.dir, '.codex')
    const configuredCodexDir = path.join(tempDir!, 'custom-codex-home')
    fs.mkdirSync(path.join(defaultCodexDir, 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(configuredCodexDir, 'sessions'), { recursive: true })
    fs.writeFileSync(
      path.join(configuredCodexDir, 'AGENTS.md'),
      '# Custom Codex home instructions\n'
    )

    const adapter = new CodexAdapter(undefined, mockHome.dir, { CODEX_HOME: configuredCodexDir })
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(configuredCodexDir, 'sessions'),
          status: 'scanned'
        }),
        expect.objectContaining({
          path: path.join(configuredCodexDir, 'AGENTS.md'),
          status: 'scanned'
        })
      ])
    )
    expect(sources).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: path.join(defaultCodexDir, 'sessions') })
      ])
    )
    expect(result.assets.map((asset) => [asset.type, asset.path])).toEqual(
      expect.arrayContaining([
        ['agents-md', path.join(configuredCodexDir, 'AGENTS.md')]
      ])
    )
  })

  it('scans additional explicit Codex homes', async () => {
    const extraCodexDir = path.join(tempDir!, 'wsl-codex-home')
    fs.mkdirSync(path.join(extraCodexDir, 'sessions'), { recursive: true })
    fs.writeFileSync(path.join(extraCodexDir, 'AGENTS.md'), '# WSL Codex instructions\n')

    const adapter = new CodexAdapter(undefined, mockHome.dir, {
      BERTH_EXTRA_CODEX_HOMES: extraCodexDir
    })
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: path.join(extraCodexDir, 'sessions'),
          status: 'scanned'
        }),
        expect.objectContaining({
          path: path.join(extraCodexDir, 'AGENTS.md'),
          status: 'scanned'
        })
      ])
    )
    expect(result.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'agents-md',
          path: path.join(extraCodexDir, 'AGENTS.md')
        })
      ])
    )
  })

  it('scans active and archived Codex rollout sessions', async () => {
    const codexDir = path.join(mockHome.dir, '.codex')
    const sessionsDir = path.join(codexDir, 'sessions')
    const archivedDir = path.join(codexDir, 'archived_sessions')
    fs.mkdirSync(sessionsDir, { recursive: true })
    fs.mkdirSync(archivedDir, { recursive: true })
    fs.writeFileSync(
      path.join(sessionsDir, 'rollout-active.jsonl'),
      JSON.stringify({
        type: 'session_meta',
        payload: { id: 'active-session', cwd: 'D:\\Code\\active', model: 'gpt-5' }
      }) + '\n'
    )
    fs.writeFileSync(
      path.join(archivedDir, 'rollout-archived.jsonl'),
      JSON.stringify({
        type: 'session_meta',
        payload: { id: 'archived-session', cwd: 'D:\\Code\\archived', model: 'gpt-5' }
      }) + '\n'
    )

    const adapter = new CodexAdapter()
    const sources = await adapter.scanSourceCoverage()
    const result = await adapter.scanAll()

    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: sessionsDir,
          code: 'codex.user.sessions',
          status: 'scanned'
        }),
        expect.objectContaining({
          path: archivedDir,
          scope: 'session',
          code: 'codex.session.archived-sessions',
          status: 'scanned'
        })
      ])
    )
    expect(result.assets.map((asset) => asset.meta.sessionId)).toEqual(
      expect.arrayContaining(['active-session', 'archived-session'])
    )
    expect(result.assets.find((asset) => asset.meta.sessionId === 'archived-session')?.meta.archived).toBe(true)
  })

  it('records parser errors without stopping the Codex scan', async () => {
    const codexDir = path.join(mockHome.dir, '.codex')
    fs.mkdirSync(codexDir, { recursive: true })
    fs.writeFileSync(path.join(codexDir, 'config.toml'), '[mcp_servers.bad\ncommand = "bad"')
    const adapter = new CodexAdapter()

    const result = await adapter.scanAll()

    expect(result.assets).toEqual([])
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: path.join(codexDir, 'config.toml'),
        type: 'codex-config'
      })
    ])
  })
})
