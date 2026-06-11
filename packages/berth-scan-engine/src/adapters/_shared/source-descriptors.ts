import type { AgentCapabilityPluginSourceDescriptor } from '@shared/types/agent-plugin'
import type { AssetCategory, AssetScope, ScanRoot, ScanSourceCode, ScanSourceKind } from '@shared/types/asset'

// GH-115 T8: per-agent 扫描源 descriptor 的构造/查询助手。
// 数据本体在 adapters/{claude-code,codex}/descriptors.ts (per-agent 知识归 adapter 侧);
// agent-plugins/descriptors.ts 聚合 re-export — 依赖方向 agent-plugins → adapters 单向。

export function sourceDescriptor(
  code: ScanSourceCode,
  scope: AssetScope,
  kind: ScanSourceKind,
  categories: AssetCategory[],
  pathPattern: string
): AgentCapabilityPluginSourceDescriptor {
  return {
    code,
    scope,
    kind,
    categories,
    pathPattern,
    labelKey: `settings.agentPluginSources.${code}.label`,
    descriptionKey: `settings.agentPluginSources.${code}.description`
  }
}

export function scanRootFromDescriptor(
  descriptors: AgentCapabilityPluginSourceDescriptor[],
  code: ScanSourceCode,
  rootPath: string,
  status: NonNullable<ScanRoot['status']> = 'scanned'
): ScanRoot {
  const descriptor = descriptors.find((item) => item.code === code)
  if (!descriptor) {
    throw new Error(`Unknown scan source descriptor: ${code}`)
  }
  return {
    path: rootPath,
    scope: descriptor.scope,
    code: descriptor.code,
    categories: descriptor.categories,
    kind: descriptor.kind,
    status
  }
}
