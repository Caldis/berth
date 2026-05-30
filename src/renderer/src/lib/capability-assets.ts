import type { Asset, AssetScope } from '@shared/types/asset'

export type PermissionRuleKind = 'allow' | 'ask' | 'deny' | 'bypass'
export type PermissionRuleRisk = 'none' | 'broad' | 'bypass'
export type EnvVarGroup = 'runtime' | 'mcp' | 'hooks' | 'telemetry' | 'provider'

export interface PermissionRuleRow {
  id: string
  kind: PermissionRuleKind
  rule: string
  scope: AssetScope
  path: string
  risk: PermissionRuleRisk
}

export interface EnvVarRow {
  id: string
  name: string
  value: string
  scope: AssetScope
  path: string
  sensitive: boolean
  group: EnvVarGroup
}

export interface PermissionSummary {
  allow: number
  ask: number
  deny: number
  bypass: number
  broadAllow: number
  sourceCount: number
  scopeCounts: Record<AssetScope, number>
}

export interface EnvVarGroupSection {
  group: EnvVarGroup
  rows: EnvVarRow[]
}

export const MASKED_ENV_VALUE = '••••••'

const permissionKinds: PermissionRuleKind[] = ['allow', 'ask', 'deny', 'bypass']

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function toPermissionKind(value: unknown): PermissionRuleKind | undefined {
  return typeof value === 'string' && permissionKinds.includes(value as PermissionRuleKind)
    ? value as PermissionRuleKind
    : undefined
}

function isSensitiveName(name: string): boolean {
  return /(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|AUTH|PRIVATE)/i.test(name)
}

function isBroadPermissionRule(rule: string): boolean {
  const normalized = rule.replace(/\s+/g, '')
  return normalized === '*' || normalized.includes('(*)') || normalized.includes('(**)') || normalized === 'Bash'
}

function classifyEnvVar(name: string, path: string): EnvVarGroup {
  const haystack = `${name} ${path}`.toUpperCase()

  if (haystack.includes('MCP')) return 'mcp'
  if (haystack.includes('HOOK')) return 'hooks'
  if (/(OTEL|TELEMETRY|SENTRY|STATSIG|DEBUG|LOG_LEVEL|TRACE)/.test(haystack)) return 'telemetry'
  if (/(OPENAI|ANTHROPIC|CLAUDE|CODEX|API_KEY|TOKEN|AUTH|MODEL)/.test(haystack)) return 'provider'

  return 'runtime'
}

function permissionRisk(kind: PermissionRuleKind, rule: string): PermissionRuleRisk {
  if (kind === 'bypass') return 'bypass'
  if (kind === 'allow' && isBroadPermissionRule(rule)) return 'broad'
  return 'none'
}

export function normalizePermissionRules(assets: Asset[]): PermissionRuleRow[] {
  const rows: PermissionRuleRow[] = []

  for (const asset of assets) {
    const kind = toPermissionKind(asset.meta.kind) ?? toPermissionKind(asset.meta.listType)
    const rules = asStringArray(asset.meta.rules)
    const pattern = asString(asset.meta.pattern)

    if (kind) {
      if (rules.length > 0) {
        rows.push(...rules.map((rule, index) => ({
          id: `${asset.id}:${kind}:${index}`,
          kind,
          rule,
          scope: asset.scope,
          path: asset.path,
          risk: permissionRisk(kind, rule)
        })))
      } else if (pattern) {
        rows.push({
          id: `${asset.id}:${kind}:pattern`,
          kind,
          rule: pattern,
          scope: asset.scope,
          path: asset.path,
          risk: permissionRisk(kind, pattern)
        })
      }
    }

    if (asset.meta.bypassPermissions === true) {
      rows.push({
        id: `${asset.id}:bypass`,
        kind: 'bypass',
        rule: 'bypassPermissions',
        scope: asset.scope,
        path: asset.path,
        risk: 'bypass'
      })
    }
  }

  return rows
}

export function normalizeEnvVars(assets: Asset[]): EnvVarRow[] {
  const rows: EnvVarRow[] = []

  for (const asset of assets) {
    const keys = asStringArray(asset.meta.keys)

    if (keys.length > 0) {
      rows.push(...keys.map((key) => ({
        id: `${asset.id}:${key}`,
        name: key,
        value: MASKED_ENV_VALUE,
        scope: asset.scope,
        path: asset.path,
        sensitive: true,
        group: classifyEnvVar(key, asset.path)
      })))
      continue
    }

    const value = asString(asset.meta.value)
    const sensitive = asset.sensitive === true || isSensitiveName(asset.name)

    rows.push({
      id: asset.id,
      name: asset.name,
      value: sensitive ? MASKED_ENV_VALUE : value ?? MASKED_ENV_VALUE,
      scope: asset.scope,
      path: asset.path,
      sensitive,
      group: classifyEnvVar(asset.name, asset.path)
    })
  }

  return rows
}

export function summarizePermissionRules(rows: PermissionRuleRow[]): PermissionSummary {
  const scopeCounts: Record<AssetScope, number> = {
    user: 0,
    project: 0,
    enterprise: 0,
    session: 0
  }
  const sources = new Set<string>()

  for (const row of rows) {
    scopeCounts[row.scope] += 1
    if (row.path) sources.add(row.path)
  }

  return {
    allow: rows.filter((row) => row.kind === 'allow').length,
    ask: rows.filter((row) => row.kind === 'ask').length,
    deny: rows.filter((row) => row.kind === 'deny').length,
    bypass: rows.filter((row) => row.kind === 'bypass').length,
    broadAllow: rows.filter((row) => row.risk === 'broad').length,
    sourceCount: sources.size,
    scopeCounts
  }
}

export function groupEnvVars(rows: EnvVarRow[]): EnvVarGroupSection[] {
  const order: EnvVarGroup[] = ['provider', 'mcp', 'hooks', 'telemetry', 'runtime']

  return order
    .map((group) => ({
      group,
      rows: rows.filter((row) => row.group === group)
    }))
    .filter((section) => section.rows.length > 0)
}
