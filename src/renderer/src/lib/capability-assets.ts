import type { Asset, AssetScope } from '@shared/types/asset'

export type PermissionRuleKind = 'allow' | 'ask' | 'deny' | 'bypass'

export interface PermissionRuleRow {
  id: string
  kind: PermissionRuleKind
  rule: string
  scope: AssetScope
  path: string
}

export interface EnvVarRow {
  id: string
  name: string
  value: string
  scope: AssetScope
  path: string
  sensitive: boolean
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
          path: asset.path
        })))
      } else if (pattern) {
        rows.push({
          id: `${asset.id}:${kind}:pattern`,
          kind,
          rule: pattern,
          scope: asset.scope,
          path: asset.path
        })
      }
    }

    if (asset.meta.bypassPermissions === true) {
      rows.push({
        id: `${asset.id}:bypass`,
        kind: 'bypass',
        rule: 'bypassPermissions',
        scope: asset.scope,
        path: asset.path
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
        sensitive: true
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
      sensitive
    })
  }

  return rows
}
