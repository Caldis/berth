# Agent Capability Plugin System

## 类型

FEATURE

## 状态

Open

## GitHub

- Issue: https://github.com/Caldis/berth/issues/12
- Number: #12

## 关联任务

- 来源归档: `docs/works/_archive/2026-06-01-gh-11-claude-hook-soft-disable/`
- 第一阶段实现: `docs/works/_archive/2026-06-02-gh-12-agent-capability-plugin-system/`

## 当前进度

- 2026-06-02: 第一阶段已完成。已加入内置 Claude Code / Codex plugin registry、只读 IPC、设置页 `Agent Capability Plugins` 区块、权限/能力/来源覆盖展示和测试。
- 2026-06-02: source descriptors 已完成。内置插件现在声明 Claude Code / Codex 的来源 code、scope、kind、categories 和 path pattern, runtime coverage 可按 code 对齐 descriptor。
- 2026-06-02: asset descriptors 已完成。内置插件现在声明 Claude Code / Codex 当前能解析的顶层资产类型、category、scopes、source code 关联和 sensitive 标记。
- 后续仍有效: health checks 迁入 plugin 定义, Hook schema-driven UI, 第三方插件 manifest 和版本兼容。

## PRD

### 背景

当前应用已经支持 Claude Code 和 Codex, 但 Agent 差异越来越多: 来源目录、配置格式、hook 管理、健康检查、会话解析、usage 数据、managed 配置规则都不一样。现有 `AgentAdapter` 主要承担扫描职责, 操作能力和 UI 展示仍散在 renderer、IPC、parser、health check 和 hooks manager 中。

需要把“某个 Agent 能被应用如何识别、展示和操作”抽成用户能理解的插件概念: `Agent Capability Plugin`。

### 目标

- Claude Code 和 Codex 作为内置 `Agent Capability Plugin`。
- 设置页新增 `Agent Capability Plugins` 入口, 展示内置插件、版本、目标 Agent、启用状态、权限和来源覆盖。
- 后续允许安装第三方插件, 支持版本概念和 Agent 版本兼容。
- 插件描述完整应用能力, 不只 hooks:
  - source discovery
  - asset parsing
  - health checks
  - session / usage parsing
  - capability actions
  - UI labels and guidance
  - write permissions
- 后续接入 Hermes、PI 或其他 Agent 时, 理想流程是把 Agent 源码和官方文档交给生成流程, 产出插件草案, 再人工 review 权限和写操作。

### 用户故事

- 作为普通用户, 我能看见当前启用的 Claude Code / Codex 内置插件版本和它们会读取、写入哪些本地路径。
- 作为维护者, 我能把某个 Agent 的来源扫描、资产解析、健康检查、Hook 操作和 UI 文案集中放进同一个插件定义。
- 作为后续扩展者, 我能基于 Hermes / PI 的源码和官方文档生成插件草案, 再人工检查权限与写操作。

### 初步接口方向

```ts
interface AgentCapabilityPlugin {
  id: string
  displayName: string
  version: string
  builtin: boolean
  agentCompatibility: {
    name: string
    versionRange?: string
  }
  sources: SourceDescriptor[]
  assetTypes: AssetTypeDescriptor[]
  hookSchemas?: HookSchemaDescriptor[]
  healthChecks: HealthCheckDescriptor[]
  actions: ActionDescriptor[]
  permissions: Array<{
    kind: 'read' | 'write' | 'execute'
    paths?: string[]
    reason: string
  }>
}
```

### Hook schema-driven UI

Hook 页面不应该长期硬编码每个 handler type 的展示方式。插件需要描述:

- 支持的 event 列表。
- 支持的 handler type。
- 每个 handler type 的主展示字段, 例如 `command`、`url`、`server.tool`、`prompt`。
- 字段是否必填, 以及缺失时的健康检查级别。
- 该 Agent 是否执行这种 handler, 例如 Codex 当前只执行 `command`。
- 该来源是否允许写入和启用/禁用。

### 权限模型

- `read`: 扫描本地配置、session、skills、plugins 等文件。
- `write`: 修改 Agent 配置或 Berth sidecar。
- `execute`: 调用外部命令或 Agent 工具。
- 所有 `write` / `execute` 能力必须能在 UI 中解释原因, 并支持禁用。

### 非目标

- GH-11 只实现 hooks 相关的内部切片, 不实现插件下载和外部插件加载。
- 外部插件一旦能写本地配置文件, 必须先有权限展示、确认文案、备份和冲突处理模型。
- 生成插件只能产出草案; 写文件、执行命令、读取敏感路径等权限必须人工确认后启用。
- 不在第一版支持远程市场、自动更新或后台执行未知插件代码。

### 分阶段建议

- 第一阶段: Claude Code / Codex 内置插件元数据, 设置页只读展示。
- 第二阶段: source discovery、asset parsing、health checks 逐步从现有 adapter 迁入插件定义。
- 第三阶段: Hook schema-driven UI 和 hook action descriptors。
- 第四阶段: 第三方插件 manifest、schema 校验、版本兼容和权限确认。

### 验收方向

- 设置页能列出 Claude Code / Codex 内置插件及版本。
- 扫描、健康检查、hook 操作逐步通过 plugin registry 分发, 页面不再散落 `if agentId`。
- Hook 展示字段来自 plugin schema, 页面不再硬编码各 Agent 的 handler type。
- 第三方插件 manifest 有 schema 校验和版本兼容检查。
- 插件权限能在 UI 中解释清楚, 尤其是写入和执行权限。
