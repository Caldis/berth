# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

在 `src/shared/types/agent-plugin.ts` 增加只属于 plugin registry 的健康检查描述符类型。为避免 `agent-plugin.ts` 与 `ipc.ts` 互相 import, 本文件内定义健康检查枚举类型, 字面量与 `HealthCheck` 当前契约保持一致。

```ts
export type AgentCapabilityPluginHealthCheckAgentId = AgentPluginAgentId
export type AgentCapabilityPluginHealthCheckSeverity = 'info' | 'warning' | 'error'
export type AgentCapabilityPluginHealthCheckCategory =
  | 'source'
  | 'syntax'
  | 'structure'
  | 'reference'
  | 'configuration'
  | 'session'
export type AgentCapabilityPluginHealthCheckConfidence = 'high' | 'medium' | 'low'

export interface AgentCapabilityPluginHealthCheckDescriptor {
  id: string
  agentId: AgentCapabilityPluginHealthCheckAgentId
  severity: AgentCapabilityPluginHealthCheckSeverity
  category: AgentCapabilityPluginHealthCheckCategory
  assetTypes?: AssetType[]
  scopes?: AssetScope[]
  sourceCodes?: ScanSourceCode[]
  confidence?: AgentCapabilityPluginHealthCheckConfidence
  labelKey: string
  descriptionKey: string
  suggestionKey?: string
  targetRoute?: string
  evidenceUrls?: string[]
}
```

`AgentCapabilityPlugin` 增加:

```ts
healthCheckDescriptors: AgentCapabilityPluginHealthCheckDescriptor[]
```

描述符 `id` 是规则族 id, 不是运行时 check id。运行时 id 中的 scope、event、object name、hash 仍由 `health.ts` 生成。

i18n key 不能直接拼接带冒号的 descriptor id。生成 `labelKey`、`descriptionKey`、`suggestionKey` 时, 将 id 中的 `:` 替换为 `.`, 避免 i18next 默认 namespace 解析把 key 截断。

## 模块结构 / 组件拆分

- `src/shared/types/agent-plugin.ts`: 新增 descriptor 类型和 plugin 字段。
- `src/main/agent-plugins/registry.ts`: 新增 Claude Code / Codex 的 `HEALTH_CHECK_DESCRIPTORS` 常量和 helper。
- `tests/unit/agent-capability-plugins.test.ts`: 增加 descriptor 断言。
- `tests/renderer/settings-agent-plugins.test.tsx`: fixture 补齐新字段, 确保 Settings 不被新字段破坏。

不改 `src/main/engine/health.ts` 的检查执行逻辑。`all:*` 共享规则本轮仍留在 engine, 不放进某个具体 plugin。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增可见区块, 避免 Settings 默认详情变重 | renderer 测试确认未出现默认详情噪音 |
| 组件选择 / 设计系统一致性 | 复用现有 Settings plugin 结构, 本轮只保证数据可消费 | renderer 测试通过 |
| 交互反馈 / 状态切换 | 展开 / 外链交互不变 | 现有 Settings 测试通过 |
| loading / empty / error / disabled / focus | 不改变现有状态 | 现有 Settings 测试通过 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 层级和交互控件 | 现有 Settings 测试通过 |
| 文案 / i18n / 数字和路径格式 | descriptor 只暴露 i18n key, 本轮不新增页面文案 | unit 测试检查 key 前缀 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| plugin contract 新增 healthCheckDescriptors | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm vitest run tests/unit/agent-capability-plugins.test.ts` | 不适用 |
| Claude / Codex descriptor 覆盖关键规则族 | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm vitest run tests/unit/agent-capability-plugins.test.ts` | 不适用 |
| Settings fixture 与 UI 兼容 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| shared type 与全仓类型 | typecheck | 全仓 | `pnpm typecheck` | 不适用 |
| harness 状态 | harness | 当前 work / 全局 | `pnpm harness:check --work docs/works/2026-06-02-gh-26-agent-plugin-health-check-descriptors`; archive 前跑全局 `pnpm harness:check` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| descriptor 类型与 plugin 字段 | 1, 4 |
| Claude Code descriptor 常量 | 2, 4, 5 |
| Codex descriptor 常量 | 3, 4, 5 |
| Settings fixture 兼容 | 6 |
| 测试矩阵与 harness 检查 | 5, 6, 7 |
