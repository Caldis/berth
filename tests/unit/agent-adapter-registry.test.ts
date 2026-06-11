import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createAgentAdapters,
  ManifestAgentAdapter
} from '@berth/scan-engine/agent-plugins/adapter-registry'
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
