import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  isVersionInRange,
  loadAgentPluginManifests,
  validateAgentPluginManifest
} from '../../src/main/agent-plugins/manifest'

const tempDirs: string[] = []

describe('agent plugin manifest validator', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('accepts a valid read-only manifest', () => {
    const entry = validateAgentPluginManifest(validManifest(), {
      path: 'example.json',
      agentVersions: {
        'example-agent': '1.4.0'
      },
      reservedIds: ['claude-code', 'codex']
    })

    expect(entry).toMatchObject({
      path: 'example.json',
      status: 'valid',
      readonly: true,
      id: 'example-agent',
      displayName: 'Example Agent',
      version: '0.1.0',
      schemaVersion: 1,
      activationReadiness: {
        status: 'metadata-only',
        reasonCode: 'metadataOnly'
      },
      agentCompatibility: {
        agentId: 'example-agent',
        name: 'Example Agent',
        versionRange: '>=1.0.0 <2.0.0',
        detectedVersion: '1.4.0'
      },
      errors: []
    })
    expect(entry.permissions).toEqual([
      {
        kind: 'read',
        scopes: ['user'],
        pathPatterns: ['~/.example'],
        reason: 'Read local Example Agent configuration.'
      }
    ])
  })

  it('marks manifests with adapter metadata as activation-ready', () => {
    const entry = validateAgentPluginManifest(
      validManifest({
        implementation: {
          kind: 'adapter',
          entrypoint: './adapter.js'
        }
      }),
      { path: 'adapter.json' }
    )

    expect(entry).toMatchObject({
      status: 'valid',
      implementation: {
        kind: 'adapter',
        entrypoint: './adapter.js'
      },
      activationReadiness: {
        status: 'activation-ready',
        reasonCode: 'implementationDeclared',
        implementationKind: 'adapter'
      },
      errors: []
    })
  })

  it('fails closed for missing fields and reserved ids', () => {
    const entry = validateAgentPluginManifest(
      {
        schemaVersion: 2,
        id: 'claude-code',
        displayName: '',
        version: 'next',
        permissions: []
      },
      {
        path: 'bad.json',
        reservedIds: ['claude-code', 'codex']
      }
    )

    expect(entry.status).toBe('invalid')
    expect(entry.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'manifest-schema-version-unsupported',
        'manifest-id-reserved',
        'manifest-field-required',
        'manifest-version-invalid',
        'manifest-permissions-empty'
      ])
    )
  })

  it('blocks write and execute permissions without treating them as validation errors', () => {
    const entry = validateAgentPluginManifest(
      validManifest({
        permissions: [
          {
            kind: 'write',
            scopes: ['user'],
            pathPatterns: ['~/.example/settings.json'],
            reason: 'Edit local settings.',
            backupStrategy: 'Write a timestamped copy before changing settings.',
            conflictStrategy: 'Abort when the file changed after the latest scan.'
          },
          {
            kind: 'execute',
            scopes: ['user'],
            pathPatterns: ['example-hook'],
            reason: 'Run hook code.'
          }
        ]
      }),
      { path: 'permissions.json' }
    )

    expect(entry.status).toBe('valid')
    expect(entry.errors).toEqual([])
    expect(entry.activationReadiness).toMatchObject({
      status: 'blocked',
      reasonCode: 'permissionApprovalRequired',
      blockedPermissionKinds: ['write', 'execute']
    })
    expect(entry.permissions).toEqual([
      {
        kind: 'write',
        scopes: ['user'],
        pathPatterns: ['~/.example/settings.json'],
        reason: 'Edit local settings.',
        backupStrategy: 'Write a timestamped copy before changing settings.',
        conflictStrategy: 'Abort when the file changed after the latest scan.'
      },
      {
        kind: 'execute',
        scopes: ['user'],
        pathPatterns: ['example-hook'],
        reason: 'Run hook code.'
      }
    ])
  })

  it('does not expose parsed permissions for invalid manifests', () => {
    const entry = validateAgentPluginManifest(
      validManifest({
        displayName: '',
        permissions: [
          {
            kind: 'write',
            scopes: ['user'],
            pathPatterns: ['~/.example/settings.json'],
            reason: 'Edit local settings.'
          }
        ]
      }),
      { path: 'invalid-with-permissions.json' }
    )

    expect(entry.status).toBe('invalid')
    expect(entry.activationReadiness).toMatchObject({
      status: 'invalid',
      reasonCode: 'manifestInvalid'
    })
    expect(entry.permissions).toBeUndefined()
  })

  it('rejects invalid implementation metadata', () => {
    const entry = validateAgentPluginManifest(
      validManifest({
        implementation: {
          kind: 'adapter',
          entrypoint: 'https://example.com/adapter.js'
        }
      }),
      { path: 'bad-implementation.json' }
    )

    expect(entry.status).toBe('invalid')
    expect(entry.activationReadiness).toMatchObject({
      status: 'invalid',
      reasonCode: 'manifestInvalid'
    })
    expect(entry.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'manifest-implementation-entrypoint-invalid',
          field: 'implementation.entrypoint'
        })
      ])
    )
  })

  it('rejects non-https references', () => {
    const entry = validateAgentPluginManifest(
      validManifest({
        references: [
          {
            label: 'Docs',
            url: 'http://example.com/docs'
          }
        ]
      }),
      { path: 'references.json' }
    )

    expect(entry.status).toBe('invalid')
    expect(entry.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'manifest-reference-url-invalid',
          field: 'references.0.url'
        })
      ])
    )
  })

  it('marks version mismatches as incompatible', () => {
    const entry = validateAgentPluginManifest(validManifest(), {
      path: 'incompatible.json',
      agentVersions: {
        'example-agent': '2.1.0'
      }
    })

    expect(entry.status).toBe('incompatible')
    expect(entry.activationReadiness).toMatchObject({
      status: 'incompatible',
      reasonCode: 'agentVersionIncompatible'
    })
    expect(entry.errors).toEqual([
      expect.objectContaining({
        code: 'manifest-agent-version-incompatible',
        field: 'agentCompatibility.versionRange'
      })
    ])
  })

  it('ignores non-string detected agent versions', () => {
    const entry = validateAgentPluginManifest(validManifest(), {
      path: 'runtime-version.json',
      agentVersions: {
        'example-agent': 1 as unknown as string
      }
    })

    expect(entry.status).toBe('valid')
    expect(entry.agentCompatibility?.detectedVersion).toBeUndefined()
    expect(entry.activationReadiness.status).toBe('metadata-only')
    expect(entry.errors).toEqual([])
  })

  it('validates supported version range expressions', () => {
    expect(isVersionInRange('1.2.3', '*')).toBe(true)
    expect(isVersionInRange('1.2.3', '1.2.3')).toBe(true)
    expect(isVersionInRange('1.2.3', '>=1.0.0 <2.0.0')).toBe(true)
    expect(isVersionInRange('1.2.3', '>1.2.3')).toBe(false)
    expect(isVersionInRange('1.2.3', '>=2.0.0')).toBe(false)
    expect(isVersionInRange('1.2.3', '^1.0.0')).toBe(false)
  })

  it('loads manifests from explicit paths and reports invalid JSON', () => {
    const dir = makeTempDir()
    const validPath = path.join(dir, 'valid.json')
    const invalidPath = path.join(dir, 'invalid.json')
    writeJson(validPath, validManifest())
    fs.writeFileSync(invalidPath, '{', 'utf8')

    const result = loadAgentPluginManifests({
      manifestPaths: [validPath, invalidPath]
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      path: validPath,
      status: 'valid',
      id: 'example-agent'
    })
    expect(result[1]).toMatchObject({
      path: invalidPath,
      status: 'invalid',
      activationReadiness: {
        status: 'invalid',
        reasonCode: 'manifestInvalid'
      },
      errors: [expect.objectContaining({ code: 'manifest-json-invalid' })]
    })
  })

  it('discovers manifests from configured home, project, and environment paths', () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const envPath = path.join(makeTempDir(), 'env.json')
    const homeManifest = path.join(homeDir, '.berth', 'agent-plugins', 'home.json')
    const projectManifest = path.join(projectDir, '.berth', 'agent-plugins', 'project.json')

    writeJson(envPath, validManifest({ id: 'env-agent', displayName: 'Env Agent' }))
    writeJson(homeManifest, validManifest({ id: 'home-agent', displayName: 'Home Agent' }))
    writeJson(projectManifest, validManifest({ id: 'project-agent', displayName: 'Project Agent' }))

    const result = loadAgentPluginManifests({
      homeDir,
      projectDir,
      env: {
        BERTH_AGENT_PLUGIN_MANIFESTS: envPath
      }
    })

    expect(result.map((entry) => entry.id)).toEqual([
      'env-agent',
      'home-agent',
      'project-agent'
    ])
  })

  it('discovers manifests from explicit plugin directories and child packages', () => {
    const dir = makeTempDir()
    const directPluginDir = path.join(dir, 'direct-plugin')
    const packageRoot = path.join(dir, 'packages')
    const childManifest = path.join(packageRoot, 'child-a', 'manifest.json')
    const childPlugin = path.join(packageRoot, 'child-b', 'plugin.json')

    writeJson(
      path.join(directPluginDir, 'manifest.json'),
      validManifest({ id: 'direct-agent', displayName: 'Direct Agent' })
    )
    writeJson(
      path.join(directPluginDir, 'plugin.json'),
      validManifest({ id: 'ignored-plugin', displayName: 'Ignored Plugin' })
    )
    writeJson(childManifest, validManifest({ id: 'child-a', displayName: 'Child A' }))
    writeJson(childPlugin, validManifest({ id: 'child-b', displayName: 'Child B' }))

    const result = loadAgentPluginManifests({
      manifestPaths: [directPluginDir, packageRoot]
    })

    expect(result.map((entry) => entry.id)).toEqual(['direct-agent', 'child-a', 'child-b'])
    expect(result.map((entry) => entry.path)).toEqual([
      path.join(directPluginDir, 'manifest.json'),
      childManifest,
      childPlugin
    ])
  })

  it('discovers package manifests from configured home and project plugin roots', () => {
    const homeDir = makeTempDir()
    const projectDir = makeTempDir()
    const homeRoot = path.join(homeDir, '.berth', 'agent-plugins', 'home-root.json')
    const homePackage = path.join(homeDir, '.berth', 'agent-plugins', 'home-package', 'manifest.json')
    const projectRoot = path.join(projectDir, '.berth', 'agent-plugins', 'project-root.json')
    const projectPackage = path.join(
      projectDir,
      '.berth',
      'agent-plugins',
      'project-package',
      'plugin.json'
    )

    writeJson(homeRoot, validManifest({ id: 'home-root', displayName: 'Home Root' }))
    writeJson(homePackage, validManifest({ id: 'home-package', displayName: 'Home Package' }))
    writeJson(projectRoot, validManifest({ id: 'project-root', displayName: 'Project Root' }))
    writeJson(
      projectPackage,
      validManifest({ id: 'project-package', displayName: 'Project Package' })
    )

    const result = loadAgentPluginManifests({
      homeDir,
      projectDir
    })

    expect(result.map((entry) => entry.id)).toEqual([
      'home-root',
      'home-package',
      'project-root',
      'project-package'
    ])
  })

  it('marks duplicate package manifest ids by discovery order', () => {
    const dir = makeTempDir()
    const first = path.join(dir, 'packages', 'a', 'manifest.json')
    const second = path.join(dir, 'packages', 'b', 'manifest.json')
    writeJson(first, validManifest())
    writeJson(second, validManifest())

    const result = loadAgentPluginManifests({
      manifestPaths: [path.join(dir, 'packages')]
    })

    expect(result[0]).toMatchObject({ path: first, status: 'valid', id: 'example-agent' })
    expect(result[1]).toMatchObject({
      path: second,
      status: 'invalid',
      id: 'example-agent',
      errors: [expect.objectContaining({ code: 'manifest-id-duplicate' })]
    })
  })

  it('marks later duplicate manifest ids as invalid', () => {
    const dir = makeTempDir()
    const first = path.join(dir, 'first.json')
    const second = path.join(dir, 'second.json')
    writeJson(first, validManifest())
    writeJson(second, validManifest())

    const result = loadAgentPluginManifests({
      manifestPaths: [first, second]
    })

    expect(result[0]).toMatchObject({ status: 'valid', id: 'example-agent' })
    expect(result[1]).toMatchObject({
      status: 'invalid',
      id: 'example-agent',
      activationReadiness: {
        status: 'invalid',
        reasonCode: 'manifestInvalid'
      },
      errors: [expect.objectContaining({ code: 'manifest-id-duplicate' })]
    })
  })
})

function validManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'example-agent',
    displayName: 'Example Agent',
    version: '0.1.0',
    agentCompatibility: {
      agentId: 'example-agent',
      name: 'Example Agent',
      versionRange: '>=1.0.0 <2.0.0'
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
        type: 'hook',
        category: 'capability',
        scopes: ['user']
      }
    ],
    healthCheckDescriptors: [
      {
        id: 'example:source:config-missing',
        agentId: 'example-agent',
        severity: 'warning',
        category: 'source'
      }
    ],
    hookSchema: {
      agentId: 'example-agent',
      events: [
        {
          eventType: 'SessionStart',
          stageId: 'session-start',
          support: 'supported',
          matcherSupported: false
        }
      ],
      handlers: [
        {
          type: 'command',
          runMode: 'runnable',
          primaryFieldNames: ['command'],
          fields: [
            {
              name: 'command',
              kind: 'string',
              required: true,
              primary: true
            }
          ]
        }
      ]
    },
    references: [
      {
        label: 'Official docs',
        url: 'https://example.com/docs'
      }
    ],
    ...overrides
  }
}

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-agent-plugin-manifest-'))
  tempDirs.push(dir)
  return dir
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}
