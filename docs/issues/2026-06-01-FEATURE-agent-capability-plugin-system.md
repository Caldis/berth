# Agent Capability Plugin System

## 类型

FEATURE

## 状态

Open

## 背景

当前应用已经支持 Claude Code 和 Codex, 但 Agent 差异越来越多: 来源目录、配置格式、hook 管理、健康检查、会话解析、usage 数据、managed 配置规则都不一样。现有 `AgentAdapter` 主要承担扫描职责, 操作能力和 UI 展示仍散在 renderer、IPC、parser、health check 和 hooks manager 中。

需要把“某个 Agent 能被应用如何识别、展示和操作”抽成用户能理解的插件概念: `Agent Capability Plugin`。

## 目标

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

## 初步接口方向

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
  actions: ActionDescriptor[]
  permissions: Array<{
    kind: 'read' | 'write' | 'execute'
    paths?: string[]
    reason: string
  }>
}
```

## 边界

- GH-11 只实现 hooks 相关的内部切片, 不实现插件下载和外部插件加载。
- 外部插件一旦能写本地配置文件, 必须先有权限展示、确认文案、备份和冲突处理模型。
- 生成插件只能产出草案; 写文件、执行命令、读取敏感路径等权限必须人工确认后启用。

## 验收方向

- 设置页能列出 Claude Code / Codex 内置插件及版本。
- 扫描、健康检查、hook 操作逐步通过 plugin registry 分发, 页面不再散落 `if agentId`。
- 第三方插件 manifest 有 schema 校验和版本兼容检查。
- 插件权限能在 UI 中解释清楚, 尤其是写入和执行权限。
