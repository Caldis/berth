import type { Asset, AssetScope } from '@shared/types/asset'

// GH-144: status-line 视图模型 + 诊断纯逻辑从 capabilities god-page 下沉到 lib, 可直测
// (此前核心聚合器/诊断零直测, 仅经组件间接覆盖)。函数与类型与原内联完全一致, 行为不变。

export type StatusLineDiagnosticLevel = 'ok' | 'warning' | 'blocked'

export interface StatusLineDiagnostic {
  level: StatusLineDiagnosticLevel
  key: string
  values?: Record<string, unknown>
}

export interface StatusLineViewModel {
  asset: Asset
  effective: boolean
  overriddenBy?: Asset
  diagnostics: StatusLineDiagnostic[]
  commandView: {
    value: string
    redacted: boolean
  }
}

const SCOPE_RANK: Record<AssetScope, number> = {
  enterprise: 4,
  project: 3,
  user: 2,
  session: 1
}

// 内部宽松版 (与 capabilities 本地 asStringArray 一致, 保行为不变)。统一到 lib 严格版
// 是行为变更, 见 god-page issue 后续 (asStringArray 统一)。
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function getStatusLineGroupKey(asset: Asset): string {
  const provider = (asset.meta.provider as string | undefined) ?? asset.agentId
  if (provider === 'codex') return 'codex:footer-items'
  return `${provider}:${String(asset.meta.statusLineKind ?? asset.meta.settingKey ?? asset.name)}`
}

export function rankStatusLineAsset(asset: Asset): number {
  return SCOPE_RANK[asset.scope] ?? 0
}

// GH-115 T0: 凭证脱敏 — "凭证不进渲染进程"边界的回归网 (3 正则组)。
export function redactStatusLineCommand(command: string): { value: string; redacted: boolean } {
  const patterns: Array<[RegExp, string]> = [
    [
      /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|APIKEY|AUTHORIZATION|BEARER)[A-Z0-9_]*\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s]+)/gi,
      '$1[redacted]'
    ],
    [
      /(\s--(?:token|api-key|apikey|password|secret|authorization)\s+)(?:"[^"]*"|'[^']*'|[^\s]+)/gi,
      '$1[redacted]'
    ],
    [/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]']
  ]
  const value = patterns.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), command)
  return { value, redacted: value !== command }
}

export function commandLooksLikeScriptReference(command: string): boolean {
  return /(?:^|\s)(?:~[\\/]|\.{0,2}[\\/]|[A-Za-z]:\\)[^\s'"]+\.(?:sh|bash|zsh|ps1|py|js|mjs|cjs|bat|cmd)\b/i.test(command) ||
    /\.(?:sh|bash|zsh|ps1|py|js|mjs|cjs|bat|cmd)(?:\s|$)/i.test(command)
}

export function getStatusLineDiagnostics(asset: Asset, effective: boolean, overriddenBy?: Asset): StatusLineDiagnostic[] {
  const provider = (asset.meta.provider as string | undefined) ?? asset.agentId
  const command = (asset.meta.command as string | undefined) ?? ''
  const entryPaths = asStringArray(asset.meta.entryPaths)
  const unknownItems = asStringArray(asset.meta.unknownItems)
  const diagnostics: StatusLineDiagnostic[] = []

  if (!effective && overriddenBy) {
    diagnostics.push({
      level: 'warning',
      key: 'overridden',
      values: { scope: overriddenBy.scope }
    })
  }

  if (provider === 'codex') {
    if (asset.meta.hidden === true) diagnostics.push({ level: 'blocked', key: 'hidden' })
    if (unknownItems.length > 0) {
      diagnostics.push({
        level: 'warning',
        key: 'unknownItems',
        values: { count: unknownItems.length }
      })
    }
  } else {
    if (asset.meta.disabledByDisableAllHooks === true) diagnostics.push({ level: 'blocked', key: 'disabled' })
    if (!command.trim()) diagnostics.push({ level: 'warning', key: 'missingCommand' })
    if (command && entryPaths.length === 0 && commandLooksLikeScriptReference(command)) {
      diagnostics.push({ level: 'warning', key: 'unresolvedEntry' })
    }
  }

  return diagnostics.length > 0 ? diagnostics : [{ level: 'ok', key: 'ok' }]
}

export function getWorstDiagnosticLevel(diagnostics: StatusLineDiagnostic[]): StatusLineDiagnosticLevel {
  if (diagnostics.some((diagnostic) => diagnostic.level === 'blocked')) return 'blocked'
  if (diagnostics.some((diagnostic) => diagnostic.level === 'warning')) return 'warning'
  return 'ok'
}

export function buildStatusLineViewModels(assets: Asset[]): StatusLineViewModel[] {
  const bestByGroup = new Map<string, Asset>()

  assets.forEach((asset) => {
    const key = getStatusLineGroupKey(asset)
    const current = bestByGroup.get(key)
    if (!current || rankStatusLineAsset(asset) > rankStatusLineAsset(current)) {
      bestByGroup.set(key, asset)
    }
  })

  return assets.map((asset) => {
    const effective = bestByGroup.get(getStatusLineGroupKey(asset))?.id === asset.id
    const overriddenBy = effective ? undefined : bestByGroup.get(getStatusLineGroupKey(asset))
    const command = (asset.meta.command as string | undefined) ?? ''
    const commandView = redactStatusLineCommand(command)
    return {
      asset,
      effective,
      overriddenBy,
      commandView,
      diagnostics: getStatusLineDiagnostics(asset, effective, overriddenBy)
    }
  })
}
