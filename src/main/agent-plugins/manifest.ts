import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type {
  AgentCapabilityPluginAssetDescriptor,
  AgentCapabilityPluginHealthCheckDescriptor,
  AgentCapabilityPluginHookEventDescriptor,
  AgentCapabilityPluginHookHandlerDescriptor,
  AgentCapabilityPluginHookHandlerFieldDescriptor,
  AgentCapabilityPluginHookSchemaDescriptor,
  AgentCapabilityPluginManifestActivationReadiness,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestImplementation,
  AgentCapabilityPluginManifestPermission,
  AgentCapabilityPluginPermissionKind,
  AgentCapabilityPluginManifestValidationError,
  AgentCapabilityPluginReference,
  AgentCapabilityPluginSourceDescriptor
} from '@shared/types/agent-plugin'
import type {
  AssetCategory,
  AssetScope,
  AssetType,
  ScanSourceCode,
  ScanSourceKind
} from '@shared/types/asset'

const SUPPORTED_SCHEMA_VERSION = 1
const MANIFEST_ENV = 'BERTH_AGENT_PLUGIN_MANIFESTS'
const PACKAGE_MANIFEST_FILENAMES = ['manifest.json', 'plugin.json'] as const
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

const ASSET_SCOPES = ['user', 'project', 'enterprise', 'session'] as const
const ASSET_CATEGORIES = [
  'instruction',
  'capability',
  'state',
  'observability',
  'integration'
] as const
const SCAN_SOURCE_KINDS = ['directory', 'file', 'policy'] as const
const ASSET_TYPES = [
  'claude-md',
  'agents-md',
  'skill',
  'agent',
  'command',
  'output-mode',
  'team',
  'mcp-server',
  'hook',
  'plugin',
  'marketplace',
  'statusline',
  'permission',
  'env',
  'session',
  'plan',
  'todo',
  'file-history',
  'history',
  'shell-snapshot',
  'stats-cache',
  'usage-data',
  'statsig',
  'debug',
  'ide-lock',
  'credential',
  'worktree',
  'backup'
] as const
const HEALTH_CHECK_SEVERITIES = ['info', 'warning', 'error'] as const
const HEALTH_CHECK_CONFIDENCES = ['high', 'medium', 'low'] as const
const HEALTH_CHECK_CATEGORIES = [
  'source',
  'syntax',
  'structure',
  'reference',
  'configuration',
  'session'
] as const
const HOOK_LIFECYCLE_STAGE_IDS = [
  'session-start',
  'user-input',
  'tool-before',
  'permission',
  'tool-after',
  'subagent',
  'context-maintenance',
  'session-stop',
  'environment'
] as const
const HOOK_SUPPORT_VALUES = ['supported', 'partial', 'unsupported'] as const
const HOOK_HANDLER_RUN_MODES = ['runnable', 'parsed-only', 'unsupported'] as const
const HOOK_FIELD_KINDS = ['string', 'string-array', 'boolean', 'number', 'object'] as const
const PERMISSION_KINDS = ['read', 'write', 'execute'] as const
const BLOCKED_PERMISSION_KINDS = ['write', 'execute'] as const
const manifestCache = new Map<string, { fingerprint: string; entry: AgentCapabilityPluginManifestEntry }>()

export interface AgentCapabilityPluginManifestLoadOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
  manifestPaths?: string[]
  agentVersions?: Record<string, string | undefined>
  reservedIds?: Iterable<string>
}

export interface AgentCapabilityPluginManifestValidationContext {
  path: string
  agentVersions?: Record<string, string | undefined>
  reservedIds?: Iterable<string>
}

interface ParsedVersion {
  major: number
  minor: number
  patch: number
  prerelease?: string
}

export function loadAgentPluginManifests(
  options: AgentCapabilityPluginManifestLoadOptions = {}
): AgentCapabilityPluginManifestEntry[] {
  const manifestPaths = discoverManifestPaths(options)
  const reservedIds = new Set(options.reservedIds ?? [])
  const seenManifestIds = new Set<string>()
  const contextFingerprint = createValidationContextFingerprint(options, reservedIds)

  return manifestPaths.map((manifestPath) => {
    const statFingerprint = readStatFingerprint(manifestPath)
    const cacheKey = `${path.resolve(manifestPath)}::${contextFingerprint}`
    const cached = statFingerprint ? manifestCache.get(cacheKey) : undefined
    if (cached?.fingerprint === statFingerprint) {
      return markDuplicateManifestId(cached.entry, seenManifestIds)
    }

    let raw: string
    try {
      raw = fs.readFileSync(manifestPath, 'utf8')
    } catch (err) {
      return invalidEntry(manifestPath, {
        code: 'manifest-read-error',
        message: err instanceof Error ? err.message : String(err)
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      return invalidEntry(manifestPath, {
        code: 'manifest-json-invalid',
        message: err instanceof Error ? err.message : String(err)
      })
    }

    const entry = validateAgentPluginManifest(parsed, {
      path: manifestPath,
      agentVersions: options.agentVersions,
      reservedIds
    })

    if (statFingerprint) {
      manifestCache.set(cacheKey, { fingerprint: statFingerprint, entry })
    }

    return markDuplicateManifestId(entry, seenManifestIds)
  })
}

export function resetAgentPluginManifestCacheForTests(): void {
  manifestCache.clear()
}

function markDuplicateManifestId(
  entry: AgentCapabilityPluginManifestEntry,
  seenManifestIds: Set<string>
): AgentCapabilityPluginManifestEntry {
  if (!entry.id || entry.status === 'invalid') return entry
  if (seenManifestIds.has(entry.id)) {
    return markEntryInvalid(entry, {
      code: 'manifest-id-duplicate',
      field: 'id',
      message: `Manifest id "${entry.id}" is already used by another manifest.`
    })
  }
  seenManifestIds.add(entry.id)
  return entry
}

function readStatFingerprint(manifestPath: string): string | null {
  try {
    const stat = fs.statSync(manifestPath)
    if (!stat.isFile()) return null
    return `${stat.size}:${stat.mtimeMs}`
  } catch {
    return null
  }
}

function createValidationContextFingerprint(
  options: AgentCapabilityPluginManifestLoadOptions,
  reservedIds: Set<string>
): string {
  return JSON.stringify({
    agentVersions: sortRecord(options.agentVersions ?? {}),
    reservedIds: [...reservedIds].sort()
  })
}

function sortRecord(record: Record<string, string | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)))
}

export function validateAgentPluginManifest(
  value: unknown,
  context: AgentCapabilityPluginManifestValidationContext
): AgentCapabilityPluginManifestEntry {
  const errors: AgentCapabilityPluginManifestValidationError[] = []
  const reservedIds = new Set(context.reservedIds ?? [])

  if (!isRecord(value)) {
    return invalidEntry(context.path, {
      code: 'manifest-root-invalid',
      message: 'Manifest root must be a JSON object.'
    })
  }

  const schemaVersion = readNumber(value, 'schemaVersion')
  if (schemaVersion == null) {
    errors.push(requiredError('schemaVersion'))
  } else if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    errors.push({
      code: 'manifest-schema-version-unsupported',
      field: 'schemaVersion',
      message: `schemaVersion must be ${SUPPORTED_SCHEMA_VERSION}.`
    })
  }

  const id = readString(value, 'id')
  if (!id) {
    errors.push(requiredError('id'))
  } else {
    if (!PLUGIN_ID_RE.test(id)) {
      errors.push({
        code: 'manifest-id-invalid',
        field: 'id',
        message: 'id must use lowercase letters, numbers, dots, underscores, or hyphens.'
      })
    }
    if (reservedIds.has(id)) {
      errors.push({
        code: 'manifest-id-reserved',
        field: 'id',
        message: `Manifest id "${id}" is reserved by a built-in plugin.`
      })
    }
  }

  const displayName = readString(value, 'displayName')
  if (!displayName) {
    errors.push(requiredError('displayName'))
  } else if (displayName.length > 80) {
    errors.push({
      code: 'manifest-display-name-too-long',
      field: 'displayName',
      message: 'displayName must be 80 characters or fewer.'
    })
  }

  const version = readString(value, 'version')
  if (!version) {
    errors.push(requiredError('version'))
  } else if (!parseVersion(version)) {
    errors.push({
      code: 'manifest-version-invalid',
      field: 'version',
      message: 'version must be a semantic version such as 1.2.3.'
    })
  }

  const compatibility = readCompatibility(value.agentCompatibility, errors)
  const implementation = readImplementation(value.implementation, errors)
  const permissions = readPermissions(value.permissions, errors)
  validateSourceDescriptors(value.sourceDescriptors, errors)
  validateAssetDescriptors(value.assetDescriptors, errors)
  validateHealthCheckDescriptors(value.healthCheckDescriptors, errors)
  validateHookSchema(value.hookSchema, compatibility?.agentId, errors)
  validateReferences(value.references, errors)

  const detectedVersionValue = compatibility
    ? context.agentVersions?.[compatibility.agentId]
    : undefined
  const detectedVersion = typeof detectedVersionValue === 'string' ? detectedVersionValue : undefined

  if (
    compatibility?.versionRange &&
    detectedVersion &&
    !isVersionInRange(detectedVersion, compatibility.versionRange)
  ) {
    errors.push({
      code: 'manifest-agent-version-incompatible',
      field: 'agentCompatibility.versionRange',
      message: `Detected ${compatibility.name} ${detectedVersion} does not match ${compatibility.versionRange}.`
    })
  }

  const status =
    errors.some((error) => error.code === 'manifest-agent-version-incompatible') &&
    errors.length === 1
      ? 'incompatible'
      : errors.length > 0
        ? 'invalid'
        : 'valid'
  const activationReadiness = buildActivationReadiness({
    status,
    implementation,
    blockedPermissionKinds: collectBlockedPermissionKinds(permissions)
  })
  const parsedDescriptors = status === 'invalid'
    ? {}
    : {
        sourceDescriptors: readSourceDescriptors(value.sourceDescriptors),
        assetDescriptors: readAssetDescriptors(value.assetDescriptors),
        hookSchema: readHookSchema(value.hookSchema),
        healthCheckDescriptors: readHealthCheckDescriptors(value.healthCheckDescriptors),
        references: readReferences(value.references)
      }

  return {
    path: context.path,
    status,
    readonly: true,
    id,
    displayName,
    version,
    schemaVersion,
    implementation,
    permissions: status === 'invalid' ? undefined : permissions,
    ...parsedDescriptors,
    activationReadiness,
    agentCompatibility: compatibility
      ? {
          ...compatibility,
          detectedVersion
        }
      : undefined,
    errors
  }
}

export function isVersionInRange(version: string, range: string): boolean {
  const parsedVersion = parseVersion(version)
  if (!parsedVersion) return false

  const trimmedRange = range.trim()
  if (trimmedRange === '*') return true
  const exactVersion = parseVersion(trimmedRange)
  if (exactVersion) return compareVersions(parsedVersion, exactVersion) === 0

  const comparators = trimmedRange.split(/\s+/).filter(Boolean)
  if (comparators.length === 0) return false

  return comparators.every((comparator) => {
    const match = comparator.match(/^(>=|>|<=|<)(.+)$/)
    if (!match) return false
    const target = parseVersion(match[2].trim())
    if (!target) return false
    const comparison = compareVersions(parsedVersion, target)
    switch (match[1]) {
      case '>':
        return comparison > 0
      case '>=':
        return comparison >= 0
      case '<':
        return comparison < 0
      case '<=':
        return comparison <= 0
      default:
        return false
    }
  })
}

function discoverManifestPaths(
  options: AgentCapabilityPluginManifestLoadOptions
): string[] {
  const env = options.env ?? process.env
  const homeDir = options.homeDir ?? os.homedir()
  const candidates = [
    ...readManifestSources(options.manifestPaths ?? []),
    ...readManifestSources(splitEnvPaths(env[MANIFEST_ENV])),
    ...readManifestDirectory(path.join(homeDir, '.berth', 'agent-plugins')),
    ...(options.projectDir
      ? readManifestDirectory(path.join(options.projectDir, '.berth', 'agent-plugins'))
      : [])
  ]

  const seen = new Set<string>()
  const unique: string[] = []
  for (const candidate of candidates) {
    const normalized = path.resolve(candidate)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(normalized)
  }
  return unique
}

function readManifestSources(sources: string[]): string[] {
  return sources.flatMap((source) => readManifestSource(source))
}

function readManifestSource(source: string): string[] {
  try {
    const stat = fs.statSync(source)
    if (stat.isDirectory()) return readManifestDirectory(source)
  } catch {
    // Keep missing explicit sources as candidates so callers still see read errors.
  }
  return [source]
}

function splitEnvPaths(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function readManifestDirectory(dir: string): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const preferredRootManifest = findPackageManifestFile(dir)
    const rootManifests = entries
      .filter((entry) => entry.isFile())
      .filter((entry) => isManifestJsonFile(entry.name, preferredRootManifest))
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => a.localeCompare(b))
    const packageManifests = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => findPackageManifestFile(path.join(dir, entry.name)))
      .filter((manifestPath): manifestPath is string => Boolean(manifestPath))
      .sort((a, b) => a.localeCompare(b))

    return [...rootManifests, ...packageManifests]
  } catch {
    return []
  }
}

function isManifestJsonFile(fileName: string, preferredRootManifest: string | undefined): boolean {
  const normalizedName = fileName.toLowerCase()
  if (!normalizedName.endsWith('.json')) return false
  if (normalizedName === 'plugin.json' && preferredRootManifest?.endsWith('manifest.json')) {
    return false
  }
  return true
}

function findPackageManifestFile(dir: string): string | undefined {
  for (const fileName of PACKAGE_MANIFEST_FILENAMES) {
    const manifestPath = path.join(dir, fileName)
    try {
      if (fs.statSync(manifestPath).isFile()) return manifestPath
    } catch {
      // Try the next supported manifest filename.
    }
  }
  return undefined
}

function readCompatibility(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): { agentId: string; name: string; versionRange?: string } | undefined {
  if (!isRecord(value)) {
    errors.push(requiredError('agentCompatibility'))
    return undefined
  }

  const agentId = readString(value, 'agentId')
  const name = readString(value, 'name')
  const versionRange = readString(value, 'versionRange')

  if (!agentId) {
    errors.push(requiredError('agentCompatibility.agentId'))
  } else if (!PLUGIN_ID_RE.test(agentId)) {
    errors.push({
      code: 'manifest-agent-id-invalid',
      field: 'agentCompatibility.agentId',
      message: 'agentCompatibility.agentId must use lowercase letters, numbers, dots, underscores, or hyphens.'
    })
  }

  if (!name) errors.push(requiredError('agentCompatibility.name'))

  if (versionRange && !isSupportedVersionRange(versionRange)) {
    errors.push({
      code: 'manifest-agent-version-range-invalid',
      field: 'agentCompatibility.versionRange',
      message: 'versionRange must be *, an exact semantic version, or semantic version comparators.'
    })
  }

  if (!agentId || !name) return undefined
  return {
    agentId,
    name,
    versionRange
  }
}

function readPermissions(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): AgentCapabilityPluginManifestPermission[] | undefined {
  const initialErrorCount = errors.length
  if (!Array.isArray(value)) {
    errors.push(requiredError('permissions'))
    return undefined
  }
  if (value.length === 0) {
    errors.push({
      code: 'manifest-permissions-empty',
      field: 'permissions',
      message: 'permissions must include at least one permission.'
    })
    return undefined
  }

  const permissions: AgentCapabilityPluginManifestPermission[] = []

  value.forEach((permission, index) => {
    const field = `permissions.${index}`
    if (!isRecord(permission)) {
      errors.push(objectError(field))
      return
    }

    const kind = readString(permission, 'kind')
    const parsedKind = kind && includes(PERMISSION_KINDS, kind) ? kind : undefined
    if (!kind) {
      errors.push(requiredError(`${field}.kind`))
    } else if (!parsedKind) {
      errors.push(enumError(`${field}.kind`, PERMISSION_KINDS))
    }

    const scopes = readStringEnumArray(permission.scopes, `${field}.scopes`, ASSET_SCOPES, errors)
    const pathPatterns = readStringArray(permission.pathPatterns, `${field}.pathPatterns`, errors)
    const reason = readString(permission, 'reason')
    if (!reason) errors.push(requiredError(`${field}.reason`))
    const backupStrategy = readOptionalString(permission, 'backupStrategy', `${field}.backupStrategy`, errors)
    const conflictStrategy = readOptionalString(permission, 'conflictStrategy', `${field}.conflictStrategy`, errors)

    if (parsedKind && scopes && pathPatterns && reason) {
      permissions.push({
        kind: parsedKind,
        scopes,
        pathPatterns,
        reason,
        ...(backupStrategy ? { backupStrategy } : {}),
        ...(conflictStrategy ? { conflictStrategy } : {})
      })
    }
  })

  return errors.length === initialErrorCount ? permissions : undefined
}

function readImplementation(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): AgentCapabilityPluginManifestImplementation | undefined {
  if (value == null) return undefined
  if (!isRecord(value)) {
    errors.push(objectError('implementation'))
    return undefined
  }

  const kind = readString(value, 'kind')
  const entrypoint = readString(value, 'entrypoint')

  if (!kind) {
    errors.push(requiredError('implementation.kind'))
  } else if (kind !== 'adapter') {
    errors.push(enumError('implementation.kind', ['adapter']))
  }

  if (!entrypoint) {
    errors.push(requiredError('implementation.entrypoint'))
  } else if (!isRelativeLocalPath(entrypoint)) {
    errors.push({
      code: 'manifest-implementation-entrypoint-invalid',
      field: 'implementation.entrypoint',
      message: 'implementation.entrypoint must be a relative local path.'
    })
  }

  if (kind !== 'adapter' || !entrypoint || !isRelativeLocalPath(entrypoint)) {
    return undefined
  }

  return {
    kind,
    entrypoint
  }
}

function collectBlockedPermissionKinds(
  permissions: AgentCapabilityPluginManifestPermission[] | undefined
): AgentCapabilityPluginPermissionKind[] {
  if (!permissions) return []
  const found = new Set<AgentCapabilityPluginPermissionKind>()

  permissions.forEach((permission) => {
    const kind = permission.kind
    if (kind === 'write' || kind === 'execute') found.add(kind)
  })

  return BLOCKED_PERMISSION_KINDS.filter((kind) => found.has(kind))
}

function buildActivationReadiness({
  status,
  implementation,
  blockedPermissionKinds
}: {
  status: AgentCapabilityPluginManifestEntry['status']
  implementation: AgentCapabilityPluginManifestImplementation | undefined
  blockedPermissionKinds: AgentCapabilityPluginPermissionKind[]
}): AgentCapabilityPluginManifestActivationReadiness {
  if (status === 'invalid') return invalidActivationReadiness()

  if (status === 'incompatible') {
    return {
      status: 'incompatible',
      reasonCode: 'agentVersionIncompatible',
      message: 'Detected agent version does not match this manifest.'
    }
  }

  if (blockedPermissionKinds.length > 0) {
    return {
      status: 'blocked',
      reasonCode: 'permissionApprovalRequired',
      message: 'This manifest declares write or execute permissions, which need an approval model before activation.',
      blockedPermissionKinds
    }
  }

  if (implementation) {
    return {
      status: 'activation-ready',
      reasonCode: 'implementationDeclared',
      message: 'This manifest declares adapter implementation metadata, but Berth does not execute third-party plugin code yet.',
      implementationKind: implementation.kind
    }
  }

  return {
    status: 'metadata-only',
    reasonCode: 'metadataOnly',
    message: 'This manifest only provides metadata and descriptors.'
  }
}

function validateSourceDescriptors(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (value == null) return
  if (!Array.isArray(value)) {
    errors.push(arrayError('sourceDescriptors'))
    return
  }
  value.forEach((descriptor, index) => {
    const field = `sourceDescriptors.${index}`
    if (!isRecord(descriptor)) {
      errors.push(objectError(field))
      return
    }
    if (!readString(descriptor, 'code')) errors.push(requiredError(`${field}.code`))
    if (!readString(descriptor, 'pathPattern')) errors.push(requiredError(`${field}.pathPattern`))
    validateStringEnum(descriptor.scope, `${field}.scope`, ASSET_SCOPES, errors)
    validateStringEnum(descriptor.kind, `${field}.kind`, SCAN_SOURCE_KINDS, errors)
    validateStringEnumArray(descriptor.categories, `${field}.categories`, ASSET_CATEGORIES, errors)
  })
}

function validateAssetDescriptors(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (value == null) return
  if (!Array.isArray(value)) {
    errors.push(arrayError('assetDescriptors'))
    return
  }
  value.forEach((descriptor, index) => {
    const field = `assetDescriptors.${index}`
    if (!isRecord(descriptor)) {
      errors.push(objectError(field))
      return
    }
    validateStringEnum(descriptor.type, `${field}.type`, ASSET_TYPES, errors)
    validateStringEnum(descriptor.category, `${field}.category`, ASSET_CATEGORIES, errors)
    validateStringEnumArray(descriptor.scopes, `${field}.scopes`, ASSET_SCOPES, errors)
  })
}

function validateHealthCheckDescriptors(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (value == null) return
  if (!Array.isArray(value)) {
    errors.push(arrayError('healthCheckDescriptors'))
    return
  }
  value.forEach((descriptor, index) => {
    const field = `healthCheckDescriptors.${index}`
    if (!isRecord(descriptor)) {
      errors.push(objectError(field))
      return
    }
    if (!readString(descriptor, 'id')) errors.push(requiredError(`${field}.id`))
    if (!readString(descriptor, 'agentId')) errors.push(requiredError(`${field}.agentId`))
    validateStringEnum(descriptor.severity, `${field}.severity`, HEALTH_CHECK_SEVERITIES, errors)
    validateStringEnum(descriptor.category, `${field}.category`, HEALTH_CHECK_CATEGORIES, errors)
  })
}

function validateHookSchema(
  value: unknown,
  expectedAgentId: string | undefined,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (value == null) return
  if (!isRecord(value)) {
    errors.push(objectError('hookSchema'))
    return
  }

  const agentId = readString(value, 'agentId')
  if (!agentId) {
    errors.push(requiredError('hookSchema.agentId'))
  } else if (expectedAgentId && agentId !== expectedAgentId) {
    errors.push({
      code: 'manifest-hook-schema-agent-mismatch',
      field: 'hookSchema.agentId',
      message: 'hookSchema.agentId must match agentCompatibility.agentId.'
    })
  }

  validateHookEvents(value.events, errors)
  validateHookHandlers(value.handlers, errors)
}

function validateHookEvents(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value)) {
    errors.push(arrayError('hookSchema.events'))
    return
  }
  value.forEach((event, index) => {
    const field = `hookSchema.events.${index}`
    if (!isRecord(event)) {
      errors.push(objectError(field))
      return
    }
    if (!readString(event, 'eventType')) errors.push(requiredError(`${field}.eventType`))
    validateStringEnum(event.stageId, `${field}.stageId`, HOOK_LIFECYCLE_STAGE_IDS, errors)
    validateStringEnum(event.support, `${field}.support`, HOOK_SUPPORT_VALUES, errors)
    if (typeof event.matcherSupported !== 'boolean') {
      errors.push({
        code: 'manifest-field-invalid',
        field: `${field}.matcherSupported`,
        message: `${field}.matcherSupported must be a boolean.`
      })
    }
  })
}

function validateHookHandlers(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value)) {
    errors.push(arrayError('hookSchema.handlers'))
    return
  }
  value.forEach((handler, index) => {
    const field = `hookSchema.handlers.${index}`
    if (!isRecord(handler)) {
      errors.push(objectError(field))
      return
    }
    if (!readString(handler, 'type')) errors.push(requiredError(`${field}.type`))
    validateStringEnum(handler.runMode, `${field}.runMode`, HOOK_HANDLER_RUN_MODES, errors)
    validateStringArray(handler.primaryFieldNames, `${field}.primaryFieldNames`, errors)
    validateHookHandlerFields(handler.fields, `${field}.fields`, errors)
  })
}

function validateHookHandlerFields(
  value: unknown,
  field: string,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value)) {
    errors.push(arrayError(field))
    return
  }
  value.forEach((item, index) => {
    const itemField = `${field}.${index}`
    if (!isRecord(item)) {
      errors.push(objectError(itemField))
      return
    }
    if (!readString(item, 'name')) errors.push(requiredError(`${itemField}.name`))
    validateStringEnum(item.kind, `${itemField}.kind`, HOOK_FIELD_KINDS, errors)
    if (item.required != null && typeof item.required !== 'boolean') {
      errors.push({
        code: 'manifest-field-invalid',
        field: `${itemField}.required`,
        message: `${itemField}.required must be a boolean.`
      })
    }
    if (item.primary != null && typeof item.primary !== 'boolean') {
      errors.push({
        code: 'manifest-field-invalid',
        field: `${itemField}.primary`,
        message: `${itemField}.primary must be a boolean.`
      })
    }
  })
}

function validateReferences(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (value == null) return
  if (!Array.isArray(value)) {
    errors.push(arrayError('references'))
    return
  }
  value.forEach((reference, index) => {
    const field = `references.${index}`
    if (!isRecord(reference)) {
      errors.push(objectError(field))
      return
    }
    if (!readString(reference, 'label')) errors.push(requiredError(`${field}.label`))
    const url = readString(reference, 'url')
    if (!url) {
      errors.push(requiredError(`${field}.url`))
      return
    }
    try {
      if (new URL(url).protocol !== 'https:') {
        errors.push({
          code: 'manifest-reference-url-invalid',
          field: `${field}.url`,
          message: 'reference URLs must use https.'
        })
      }
    } catch {
      errors.push({
        code: 'manifest-reference-url-invalid',
        field: `${field}.url`,
        message: 'reference URL must be valid.'
      })
    }
  })
}

function readSourceDescriptors(value: unknown): AgentCapabilityPluginSourceDescriptor[] | undefined {
  if (!Array.isArray(value)) return undefined
  const descriptors: AgentCapabilityPluginSourceDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const code = readString(item, 'code')
    const scope = readKnownString(item, 'scope', ASSET_SCOPES)
    const kind = readKnownString(item, 'kind', SCAN_SOURCE_KINDS)
    const categories = readKnownStringArray(item.categories, ASSET_CATEGORIES)
    const pathPattern = readString(item, 'pathPattern')
    if (!code || !scope || !kind || !categories || !pathPattern) continue
    descriptors.push({
      code: code as ScanSourceCode,
      scope: scope as AssetScope,
      kind: kind as ScanSourceKind,
      categories: categories as AssetCategory[],
      pathPattern,
      labelKey: readString(item, 'labelKey') ?? '',
      descriptionKey: readString(item, 'descriptionKey') ?? ''
    })
  }
  return descriptors.length > 0 ? descriptors : undefined
}

function readAssetDescriptors(value: unknown): AgentCapabilityPluginAssetDescriptor[] | undefined {
  if (!Array.isArray(value)) return undefined
  const descriptors: AgentCapabilityPluginAssetDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const type = readKnownString(item, 'type', ASSET_TYPES)
    const category = readKnownString(item, 'category', ASSET_CATEGORIES)
    const scopes = readKnownStringArray(item.scopes, ASSET_SCOPES)
    const sourceCodes = readStringList(item.sourceCodes)?.map((code) => code as ScanSourceCode)
    const sensitive = typeof item.sensitive === 'boolean' ? item.sensitive : undefined
    if (!type || !category || !scopes) continue
    descriptors.push({
      type: type as AssetType,
      category: category as AssetCategory,
      scopes: scopes as AssetScope[],
      sourceCodes,
      sensitive,
      labelKey: readString(item, 'labelKey') ?? `settings.agentPluginAssets.${type}.label`,
      descriptionKey: readString(item, 'descriptionKey') ?? `settings.agentPluginAssets.${type}.description`
    })
  }
  return descriptors.length > 0 ? descriptors : undefined
}

function readHealthCheckDescriptors(value: unknown): AgentCapabilityPluginHealthCheckDescriptor[] | undefined {
  if (!Array.isArray(value)) return undefined
  const descriptors: AgentCapabilityPluginHealthCheckDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = readString(item, 'id')
    const agentId = readString(item, 'agentId')
    const severity = readKnownString(item, 'severity', HEALTH_CHECK_SEVERITIES)
    const category = readKnownString(item, 'category', HEALTH_CHECK_CATEGORIES)
    if (!id || !agentId || !severity || !category) continue
    const translationKeyId = id.replace(/:/g, '.')
    descriptors.push({
      id,
      agentId,
      severity,
      category,
      assetTypes: readKnownStringArray(item.assetTypes, ASSET_TYPES) as AssetType[] | undefined,
      scopes: readKnownStringArray(item.scopes, ASSET_SCOPES) as AssetScope[] | undefined,
      sourceCodes: readStringList(item.sourceCodes)?.map((code) => code as ScanSourceCode),
      confidence: readKnownString(item, 'confidence', HEALTH_CHECK_CONFIDENCES),
      targetRoute: readString(item, 'targetRoute'),
      evidenceUrls: readStringList(item.evidenceUrls),
      labelKey: readString(item, 'labelKey') ?? `settings.agentPluginHealthChecks.${translationKeyId}.label`,
      descriptionKey: readString(item, 'descriptionKey') ?? `settings.agentPluginHealthChecks.${translationKeyId}.description`,
      suggestionKey: readString(item, 'suggestionKey') ?? `settings.agentPluginHealthChecks.${translationKeyId}.suggestion`
    })
  }
  return descriptors.length > 0 ? descriptors : undefined
}

function readHookSchema(value: unknown): AgentCapabilityPluginHookSchemaDescriptor | undefined {
  if (!isRecord(value)) return undefined
  const agentId = readString(value, 'agentId')
  const events = readHookEvents(value.events, agentId)
  const handlers = readHookHandlers(value.handlers, agentId)
  if (!agentId || !events || !handlers) return undefined
  return { agentId, events, handlers }
}

function readHookEvents(value: unknown, agentId: string | undefined): AgentCapabilityPluginHookEventDescriptor[] | undefined {
  if (!Array.isArray(value) || !agentId) return undefined
  const events: AgentCapabilityPluginHookEventDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const eventType = readString(item, 'eventType')
    const stageId = readKnownString(item, 'stageId', HOOK_LIFECYCLE_STAGE_IDS)
    const support = readKnownString(item, 'support', HOOK_SUPPORT_VALUES)
    if (!eventType || !stageId || !support || typeof item.matcherSupported !== 'boolean') continue
    const agentKey = toManifestTranslationKeyId(agentId)
    const eventKey = toManifestTranslationKeyId(eventType)
    events.push({
      eventType,
      stageId,
      support,
      matcherSupported: item.matcherSupported,
      matcherField: readString(item, 'matcherField'),
      labelKey: readString(item, 'labelKey') ?? `settings.agentPluginHookEvents.${agentKey}.${eventKey}.label`,
      descriptionKey: readString(item, 'descriptionKey') ?? `settings.agentPluginHookEvents.${agentKey}.${eventKey}.description`,
      evidenceUrls: readStringList(item.evidenceUrls)
    })
  }
  return events
}

function readHookHandlers(value: unknown, agentId: string | undefined): AgentCapabilityPluginHookHandlerDescriptor[] | undefined {
  if (!Array.isArray(value) || !agentId) return undefined
  const handlers: AgentCapabilityPluginHookHandlerDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const type = readString(item, 'type')
    const runMode = readKnownString(item, 'runMode', HOOK_HANDLER_RUN_MODES)
    const primaryFieldNames = readStringList(item.primaryFieldNames)
    const fields = readHookHandlerFields(item.fields, agentId, type)
    if (!type || !runMode || !primaryFieldNames || !fields) continue
    const agentKey = toManifestTranslationKeyId(agentId)
    const typeKey = toManifestTranslationKeyId(type)
    handlers.push({
      type,
      runMode,
      fields,
      primaryFieldNames,
      labelKey: readString(item, 'labelKey') ?? `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.label`,
      descriptionKey: readString(item, 'descriptionKey') ?? `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.description`,
      supportNoteKey: readString(item, 'supportNoteKey'),
      evidenceUrls: readStringList(item.evidenceUrls)
    })
  }
  return handlers
}

function readHookHandlerFields(
  value: unknown,
  agentId: string,
  handlerType: string | undefined
): AgentCapabilityPluginHookHandlerFieldDescriptor[] | undefined {
  if (!Array.isArray(value) || !handlerType) return undefined
  const fields: AgentCapabilityPluginHookHandlerFieldDescriptor[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const name = readString(item, 'name')
    const kind = readKnownString(item, 'kind', HOOK_FIELD_KINDS)
    if (!name || !kind) continue
    const agentKey = toManifestTranslationKeyId(agentId)
    const typeKey = toManifestTranslationKeyId(handlerType)
    const fieldKey = toManifestTranslationKeyId(name)
    fields.push({
      name,
      kind,
      required: typeof item.required === 'boolean' ? item.required : undefined,
      primary: typeof item.primary === 'boolean' ? item.primary : undefined,
      labelKey: readString(item, 'labelKey') ?? `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.fields.${fieldKey}.label`,
      descriptionKey: readString(item, 'descriptionKey') ?? `settings.agentPluginHookHandlers.${agentKey}.${typeKey}.fields.${fieldKey}.description`
    })
  }
  return fields
}

function readReferences(value: unknown): AgentCapabilityPluginReference[] | undefined {
  if (!Array.isArray(value)) return undefined
  const references: AgentCapabilityPluginReference[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const label = readString(item, 'label')
    const url = readString(item, 'url')
    if (!label || !url) continue
    references.push({ label, url })
  }
  return references.length > 0 ? references : undefined
}

function readKnownString<T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowedValues: T
): T[number] | undefined {
  const value = readString(record, key)
  return value && includes(allowedValues, value) ? value : undefined
}

function readKnownStringArray<T extends readonly string[]>(
  value: unknown,
  allowedValues: T
): T[number][] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const result: T[number][] = []
  for (const item of value) {
    if (typeof item !== 'string' || !includes(allowedValues, item)) return undefined
    result.push(item)
  }
  return result
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) return undefined
    result.push(item.trim())
  }
  return result
}

function toManifestTranslationKeyId(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]/g, '.')
}

function isRelativeLocalPath(value: string): boolean {
  return (
    !path.isAbsolute(value) &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) &&
    (value.startsWith('./') || value.startsWith('../'))
  )
}

function isSupportedVersionRange(range: string): boolean {
  const trimmed = range.trim()
  if (trimmed === '*') return true
  if (parseVersion(trimmed)) return true
  const comparators = trimmed.split(/\s+/).filter(Boolean)
  return comparators.length > 0 && comparators.every((comparator) => {
    const match = comparator.match(/^(>=|>|<=|<)(.+)$/)
    return Boolean(match && parseVersion(match[2].trim()))
  })
}

function parseVersion(value: string | undefined): ParsedVersion | null {
  if (!value) return null
  const match = value.trim().match(SEMVER_RE)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]
  }
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key]
  }
  if (!a.prerelease && !b.prerelease) return 0
  if (!a.prerelease) return 1
  if (!b.prerelease) return -1
  return a.prerelease.localeCompare(b.prerelease)
}

function validateStringEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowedValues: T,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (typeof value !== 'string' || !includes(allowedValues, value)) {
    errors.push(enumError(field, allowedValues))
  }
}

function validateStringEnumArray<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowedValues: T,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(arrayError(field))
    return
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !includes(allowedValues, item)) {
      errors.push(enumError(`${field}.${index}`, allowedValues))
    }
  })
}

function readStringEnumArray<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowedValues: T,
  errors: AgentCapabilityPluginManifestValidationError[]
): T[number][] | undefined {
  const initialErrorCount = errors.length
  validateStringEnumArray(value, field, allowedValues, errors)
  if (errors.length !== initialErrorCount || !Array.isArray(value)) return undefined
  return value.map((item) => String(item).trim() as T[number])
}

function validateStringArray(
  value: unknown,
  field: string,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(arrayError(field))
    return
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      errors.push({
        code: 'manifest-field-invalid',
        field: `${field}.${index}`,
        message: `${field}.${index} must be a non-empty string.`
      })
    }
  })
}

function readStringArray(
  value: unknown,
  field: string,
  errors: AgentCapabilityPluginManifestValidationError[]
): string[] | undefined {
  const initialErrorCount = errors.length
  validateStringArray(value, field, errors)
  if (errors.length !== initialErrorCount || !Array.isArray(value)) return undefined
  return value.map((item) => String(item).trim())
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  field: string,
  errors: AgentCapabilityPluginManifestValidationError[]
): string | undefined {
  if (!(key in record) || record[key] == null) return undefined
  const value = readString(record, key)
  if (value) return value
  errors.push({
    code: 'manifest-field-invalid',
    field,
    message: `${field} must be a non-empty string when provided.`
  })
  return undefined
}

function invalidEntry(
  manifestPath: string,
  error: AgentCapabilityPluginManifestValidationError
): AgentCapabilityPluginManifestEntry {
  return {
    path: manifestPath,
    status: 'invalid',
    readonly: true,
    activationReadiness: invalidActivationReadiness(),
    errors: [error]
  }
}

function markEntryInvalid(
  entry: AgentCapabilityPluginManifestEntry,
  error: AgentCapabilityPluginManifestValidationError
): AgentCapabilityPluginManifestEntry {
  return {
    ...entry,
    status: 'invalid',
    activationReadiness: invalidActivationReadiness(),
    errors: [...entry.errors, error]
  }
}

function invalidActivationReadiness(): AgentCapabilityPluginManifestActivationReadiness {
  return {
    status: 'invalid',
    reasonCode: 'manifestInvalid',
    message: 'Manifest has validation errors and cannot be activated.'
  }
}

function requiredError(field: string): AgentCapabilityPluginManifestValidationError {
  return {
    code: 'manifest-field-required',
    field,
    message: `${field} is required.`
  }
}

function objectError(field: string): AgentCapabilityPluginManifestValidationError {
  return {
    code: 'manifest-field-invalid',
    field,
    message: `${field} must be an object.`
  }
}

function arrayError(field: string): AgentCapabilityPluginManifestValidationError {
  return {
    code: 'manifest-field-invalid',
    field,
    message: `${field} must be a non-empty array.`
  }
}

function enumError(
  field: string,
  allowedValues: readonly string[]
): AgentCapabilityPluginManifestValidationError {
  return {
    code: 'manifest-field-invalid',
    field,
    message: `${field} must be one of: ${allowedValues.join(', ')}.`
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function includes<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value)
}
