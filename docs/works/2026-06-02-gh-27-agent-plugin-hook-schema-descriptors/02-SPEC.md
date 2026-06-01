# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

在 `src/shared/types/agent-plugin.ts` 增加 hook schema descriptor。它描述 Agent 原生 hook 能力, 不描述 Berth 的运行时文件写入实现。

核心类型:

```ts
export type AgentCapabilityPluginHookLifecycleStageId =
  | 'session-start'
  | 'user-input'
  | 'tool-before'
  | 'permission'
  | 'tool-after'
  | 'subagent'
  | 'context-maintenance'
  | 'session-stop'
  | 'environment'

export type AgentCapabilityPluginHookSupport = 'supported' | 'partial' | 'unsupported'
export type AgentCapabilityPluginHookHandlerRunMode = 'runnable' | 'parsed-only' | 'unsupported'

export interface AgentCapabilityPluginHookEventDescriptor {
  eventType: string
  stageId: AgentCapabilityPluginHookLifecycleStageId
  support: AgentCapabilityPluginHookSupport
  matcherSupported: boolean
  matcherField?: string
  labelKey: string
  descriptionKey: string
  evidenceUrls?: string[]
}

export interface AgentCapabilityPluginHookHandlerFieldDescriptor {
  name: string
  kind: 'string' | 'string-array' | 'boolean' | 'number' | 'object'
  required?: boolean
  primary?: boolean
  labelKey: string
  descriptionKey: string
}

export interface AgentCapabilityPluginHookHandlerDescriptor {
  type: string
  runMode: AgentCapabilityPluginHookHandlerRunMode
  fields: AgentCapabilityPluginHookHandlerFieldDescriptor[]
  primaryFieldNames: string[]
  labelKey: string
  descriptionKey: string
  supportNoteKey?: string
  evidenceUrls?: string[]
}

export interface AgentCapabilityPluginHookSchemaDescriptor {
  agentId: AgentPluginAgentId
  events: AgentCapabilityPluginHookEventDescriptor[]
  handlers: AgentCapabilityPluginHookHandlerDescriptor[]
}
```

`AgentCapabilityPlugin` 增加:

```ts
hookSchema: AgentCapabilityPluginHookSchemaDescriptor
```

key 规则:

- event / handler descriptor id 保持官方值, 例如 `PreToolUse`、`mcp_tool`。
- i18n key 使用安全片段, 只允许字母、数字、点、横线和下划线; 不直接拼接冒号。
- handler field 的 `primary` / `primaryFieldNames` 用于后续 UI 选择主展示字段, 但本轮 UI 不强制接入。

## 模块结构 / 组件拆分

- `src/shared/types/agent-plugin.ts`: 新增 hook schema descriptor 类型和 plugin 字段。
- `src/main/agent-plugins/registry.ts`: 增加 Claude Code / Codex hook schema 常量和 helper。
- `tests/unit/agent-capability-plugins.test.ts`: 增加 event 覆盖、handler runMode、field、i18n key 断言。
- `tests/renderer/settings-agent-plugins.test.tsx`: fixture 补齐 `hookSchema`, 保证 Settings UI 兼容。

不改:

- `src/main/engine/hooks-manager.ts`
- `src/main/adapters/claude-code/parsers.ts`
- `src/main/adapters/codex/parsers.ts`
- `src/main/engine/health.ts`
- `src/shared/types/ipc.ts`

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增 Hooks 页面可见区块, 不加默认说明 | renderer 测试确认现有 Hooks / Settings 行为不变 |
| 组件选择 / 设计系统一致性 | 本轮只扩数据契约, 不新增组件 | renderer 测试通过 |
| 交互反馈 / 状态切换 | 启用/禁用、恢复中心、hover 健康提示不改 | 现有 Hooks renderer 测试通过 |
| loading / empty / error / disabled / focus | 不改变现有状态 | 现有 Hooks / Settings renderer 测试通过 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 层级 | 现有测试通过 |
| 文案 / i18n | 新 descriptor 只暴露 key, 后续 UI 任务再补具体展示文案 | unit 测试检查 key 安全 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| plugin contract 新增 hook schema | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm vitest run tests/unit/agent-capability-plugins.test.ts` | 不适用 |
| Claude / Codex event 与 handler descriptor 覆盖 | unit | `tests/unit/agent-capability-plugins.test.ts` | `pnpm vitest run tests/unit/agent-capability-plugins.test.ts` | 不适用 |
| Settings fixture 兼容新字段 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| Hooks 页面现有行为未被破坏 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` | 不适用 |
| shared 类型与 harness | typecheck/harness | 全仓 | `pnpm typecheck`; `pnpm harness:check --work docs/works/2026-06-02-gh-27-agent-plugin-hook-schema-descriptors` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| hook schema descriptor 类型 | 1, 4 |
| Claude Code hook schema 常量 | 2, 5 |
| Codex hook schema 常量 | 3, 5 |
| Settings / Hooks renderer 兼容 | 6 |
| 测试与 harness | 5, 6, 7 |
