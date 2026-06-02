import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type {
  AgentCapabilityPluginManifestActivationReadiness,
  AgentCapabilityPluginManifestEntry,
  AgentCapabilityPluginManifestImplementation,
  AgentCapabilityPluginPermissionKind,
  AgentCapabilityPluginManifestValidationError
} from '@shared/types/agent-plugin'

const SUPPORTED_SCHEMA_VERSION = 1
const MANIFEST_ENV = 'BERTH_AGENT_PLUGIN_MANIFESTS'
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

  return manifestPaths.map((manifestPath) => {
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

    if (entry.id && entry.status !== 'invalid') {
      if (seenManifestIds.has(entry.id)) {
        return markEntryInvalid(entry, {
          code: 'manifest-id-duplicate',
          field: 'id',
          message: `Manifest id "${entry.id}" is already used by another manifest.`
        })
      }
      seenManifestIds.add(entry.id)
    }

    return entry
  })
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
  validatePermissions(value.permissions, errors)
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
    blockedPermissionKinds: collectBlockedPermissionKinds(value.permissions)
  })

  return {
    path: context.path,
    status,
    readonly: true,
    id,
    displayName,
    version,
    schemaVersion,
    implementation,
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
    ...(options.manifestPaths ?? []),
    ...splitEnvPaths(env[MANIFEST_ENV]),
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

function splitEnvPaths(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function readManifestDirectory(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => path.join(dir, entry.name))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
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

function validatePermissions(
  value: unknown,
  errors: AgentCapabilityPluginManifestValidationError[]
): void {
  if (!Array.isArray(value)) {
    errors.push(requiredError('permissions'))
    return
  }
  if (value.length === 0) {
    errors.push({
      code: 'manifest-permissions-empty',
      field: 'permissions',
      message: 'permissions must include at least one permission.'
    })
    return
  }

  value.forEach((permission, index) => {
    const field = `permissions.${index}`
    if (!isRecord(permission)) {
      errors.push(objectError(field))
      return
    }

    const kind = readString(permission, 'kind')
    if (!kind) {
      errors.push(requiredError(`${field}.kind`))
    } else if (!includes(PERMISSION_KINDS, kind)) {
      errors.push(enumError(`${field}.kind`, PERMISSION_KINDS))
    }

    validateStringEnumArray(permission.scopes, `${field}.scopes`, ASSET_SCOPES, errors)
    validateStringArray(permission.pathPatterns, `${field}.pathPatterns`, errors)
    if (!readString(permission, 'reason')) errors.push(requiredError(`${field}.reason`))
  })
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

function collectBlockedPermissionKinds(value: unknown): AgentCapabilityPluginPermissionKind[] {
  if (!Array.isArray(value)) return []
  const found = new Set<AgentCapabilityPluginPermissionKind>()

  value.forEach((permission) => {
    if (!isRecord(permission)) return
    const kind = readString(permission, 'kind')
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
