# 技术方案 (Design 产物)

## 范围

本任务只增加第三方 manifest 的 activation readiness 分类和 Settings 展示。第三方插件仍不执行代码, 不加入 `plugins` active 列表, 不提供启用按钮。

覆盖 01-ANALYSIS 验收标准: 1-8。

## 数据契约

在 `src/shared/types/agent-plugin.ts` 增加:

```ts
export type AgentCapabilityPluginManifestImplementationKind = 'adapter'

export interface AgentCapabilityPluginManifestImplementation {
  kind: AgentCapabilityPluginManifestImplementationKind
  entrypoint: string
}

export type AgentCapabilityPluginManifestActivationStatus =
  | 'metadata-only'
  | 'activation-ready'
  | 'blocked'
  | 'incompatible'
  | 'invalid'

export type AgentCapabilityPluginManifestActivationReasonCode =
  | 'metadataOnly'
  | 'implementationDeclared'
  | 'permissionApprovalRequired'
  | 'agentVersionIncompatible'
  | 'manifestInvalid'

export interface AgentCapabilityPluginManifestActivationReadiness {
  status: AgentCapabilityPluginManifestActivationStatus
  reasonCode: AgentCapabilityPluginManifestActivationReasonCode
  message: string
  implementationKind?: AgentCapabilityPluginManifestImplementationKind
  blockedPermissionKinds?: AgentCapabilityPluginPermissionKind[]
}
```

并在 `AgentCapabilityPluginManifestEntry` 上增加:

```ts
implementation?: AgentCapabilityPluginManifestImplementation
activationReadiness: AgentCapabilityPluginManifestActivationReadiness
```

`message` 是主进程提供的英文 fallback, Settings 仍优先通过 `reasonCode` 和 `status` 走 i18n。

## Manifest schema 增量

新增可选字段:

```json
{
  "implementation": {
    "kind": "adapter",
    "entrypoint": "./adapter.js"
  }
}
```

规则:

- `implementation` 缺失: metadata-only。
- `implementation.kind === "adapter"` 且 `entrypoint` 是非空相对路径: activation-ready。
- `implementation.kind` 未知、`entrypoint` 缺失、绝对路径或 URL: invalid。
- 当前只声明 readiness, 不读取或执行 `entrypoint`。

## Readiness 计算

`validateAgentPluginManifest()` 在完成结构校验后计算 readiness:

1. 若 `status === 'invalid'`: readiness = invalid / manifestInvalid。
2. 若 `status === 'incompatible'`: readiness = incompatible / agentVersionIncompatible。
3. 若权限里包含 `write` 或 `execute`: readiness = blocked / permissionApprovalRequired, 并记录 `blockedPermissionKinds`。
4. 若存在合法 `implementation`: readiness = activation-ready / implementationDeclared。
5. 否则 readiness = metadata-only / metadataOnly。

权限校验调整:

- `read` / `write` / `execute` 都是结构上已知的权限 kind。
- `write` / `execute` 不再产生 validation error, 只影响 readiness。
- 未知 kind 仍产生 `manifest-field-invalid`。
- `permissions` 缺失或空数组仍然 invalid。

重复 id 的处理仍在 `loadAgentPluginManifests()` 中执行。后出现的重复 manifest 要同时变为 `status: 'invalid'` 和 readiness invalid, 避免 UI 显示为可用。

## Settings UI

`AgentCapabilityPluginsSection` 继续保持“列表摘要 + 展开详情”结构。

列表摘要新增 readiness badge:

- Built-in active plugin: 维持现状。
- Manifest metadata-only: `Metadata`。
- Manifest activation-ready: `Ready`。
- Manifest blocked: `Blocked`。
- Manifest incompatible: `Incompatible`。
- Manifest invalid: `Invalid`。

展开详情新增 Readiness 区块:

- 状态 badge。
- i18n reason 文案。
- implementation kind / entrypoint, 如有。
- blocked permission kinds, 如有。

错误列表继续只展示 validation errors。blocked permission 不再混进 validation errors。

## 界面质量与交互验收

- 列表行只增加一个短 badge, 不平铺长说明。
- readiness 说明只出现在展开详情中, 与用户之前要求的“详情里平铺”一致。
- blocked / invalid / incompatible 使用不同文案, 避免用户把权限未批准误认为 JSON 写错。
- 不新增 hover-only 关键说明, 键盘用户展开行后也能看到完整原因。
- 路径继续 monospace truncate, 标签允许换行。
- i18n 必须覆盖中英文。

## 测试矩阵

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 说明 |
|---|---|---|---|---|
| read-only manifest 变为 metadata-only | 单元测试 | `tests/unit/agent-plugin-manifest.test.ts` | `pnpm test -- tests/unit/agent-plugin-manifest.test.ts` | 覆盖验收 1,2 |
| 合法 implementation 变为 activation-ready | 单元测试 | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 覆盖验收 3 |
| write / execute 权限变为 blocked, 不再 validation error | 单元测试 | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 覆盖验收 4 |
| version mismatch readiness 为 incompatible | 单元测试 | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 覆盖验收 5 |
| 结构错误和重复 id readiness 为 invalid | 单元测试 | `tests/unit/agent-plugin-manifest.test.ts` | 同上 | 覆盖验收 6 |
| registry 保持内置插件不变并返回 manifest readiness | 单元测试 | `tests/unit/agent-capability-plugins.test.ts` | `pnpm test -- tests/unit/agent-capability-plugins.test.ts` | 覆盖验收 7 |
| Settings 展示 metadata / ready / blocked / invalid / incompatible | 渲染测试 | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm test -- tests/renderer/settings-agent-plugins.test.tsx` | 覆盖验收 8 |
| 类型与全局回归 | 类型/全量测试 | 全仓 | `pnpm typecheck`; `pnpm test`; `pnpm harness:check` | Verify 阶段执行 |

## 顺序

这些改动共享同一组类型和 fixture, 不拆并行任务。先改测试和共享类型, 再改主进程 validator, 最后改 Settings UI 和 i18n。
