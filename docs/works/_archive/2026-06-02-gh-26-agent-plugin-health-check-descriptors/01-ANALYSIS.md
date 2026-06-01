# 需求分析 (Explore 产物)

## 现状理解

当前 Agent Capability Plugin 注册表位于 `src/main/agent-plugins/registry.ts`。它已经为 Claude Code / Codex 内置 plugin 暴露:

- `capabilities`
- `permissions`
- `sourceDescriptors`
- `assetDescriptors`
- `sourceCoverage`
- `references`

跨进程类型在 `src/shared/types/agent-plugin.ts`。渲染层通过 IPC `agent-plugins:list` 拿到 plugin 列表, Settings 页面只展示摘要与展开详情。健康检查本身仍由 `src/main/engine/health.ts` 执行, IPC 类型在 `src/shared/types/ipc.ts` 的 `HealthCheck`。

健康检查已有运行时规则:

- Claude Code: settings JSON 语法、settings schema、hooks handler 字段、hook type、Windows shell、permissionMode、Bash 权限、MCP transport、instruction import、Claude/Codex 项目说明差异、skill、subagent、session 目录。
- Codex: config.toml 语法、hooks.json 语法、config schema 注释、hooks 重复定义、command hook 字段、async / prompt / agent 跳过提示、Windows command override、project config ignored keys、instruction import、skill、custom agent、session transcript。
- 共享来源: scanner parser error、session asset metadata、项目 `CLAUDE.md` / `AGENTS.md` 兼容提示。

本任务不移动这些检查器, 只让 plugin 能声明“支持哪些规则族”。规则族是稳定描述符; 具体实例仍由运行时根据 scope、文件路径、事件名、对象名、hash 生成。

## 外部文档证据

已查官方文档:

- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Codex hooks: https://developers.openai.com/codex/hooks

对设计有影响的事实:

- Claude Code hooks 是三层结构: event -> matcher group -> hook handler。handler 类型包含 `command`、`http`、`mcp_tool`、`prompt`、`agent`; 不同类型有不同必填字段。
- Codex hooks 支持 `hooks.json` 与 `config.toml` inline `[hooks]`; 同一层同时存在时会合并并警告。
- Codex 当前只运行 `type: "command"`。`prompt` / `agent` 会解析但跳过, `async: true` 也会跳过。
- Codex `commandWindows` / `command_windows` 是 Windows 专用命令覆盖。

这些事实与当前 `health.ts` 的检查方向一致。

## 关联与依赖

- `agent-plugin.ts` 不能直接 import `ipc.ts` 的 `HealthCheck*` 类型。`ipc.ts` 已 import `AgentCapabilityPluginListResult`, 反向 import 会让 shared 类型形成环。
- descriptor 应放在 plugin 契约中, 由 registry 静态声明; 健康检查执行仍在 main process。
- `all` agent 的共享健康检查不是 Claude Code 或 Codex plugin 的单独能力, 本轮保留在 health engine, 不塞进任一内置 plugin。
- Settings 当前不平铺展示新 descriptor, 只要求 fixture 与类型兼容。后续 UI 可以在详情里把健康规则作为展开项展示。

## 验收标准

1. `AgentCapabilityPlugin` 新增健康检查描述符字段, 字段能表达 rule id、severity、category、agent、asset type、scope、source code、i18n key 与证据 URL。
2. Claude Code 内置 plugin 声明当前 Claude Code 健康检查规则族, 覆盖 hooks、permissions、MCP、instructions、skills、subagents、sessions。
3. Codex 内置 plugin 声明当前 Codex 健康检查规则族, 覆盖 config、hooks、MCP、instructions、skills、custom agents、sessions。
4. 描述符不伪装成执行器: 文件读取、glob、JSON/TOML/YAML 解析、hash、dedupe 仍只在 `src/main/engine/health.ts`。
5. 单元测试能验证 descriptor id、metadata 和现有 health check 分类之间不会轻易漂移。
6. Settings plugin UI 与现有 renderer 测试继续通过。
7. harness 任务结构、typecheck 和相关测试通过。

## 界面质量与交互验收

本任务不改页面视觉与交互。仍需保证 Settings 页面拿到新增字段后不报错、不默认增加详情噪音、不破坏已有展开区层级。后续如果要展示健康规则, 应放在 plugin 详情里, 用紧凑分组或 hover/focus 说明, 不再平铺大段解释。

## 未决问题

无。全局 `all` 规则不在本轮归属到具体 plugin。
