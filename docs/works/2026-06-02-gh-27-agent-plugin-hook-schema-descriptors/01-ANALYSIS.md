# 需求分析 (Explore 产物)

## 现状理解

当前 hook 相关能力分散在四条链路:

- hook asset 扫描:
  - Claude Code: `src/main/adapters/claude-code/scanner.ts` 读 user / managed / project settings, 调 `src/main/adapters/claude-code/parsers.ts::parseHooks()`。
  - Codex: `src/main/adapters/codex/index.ts` 读 `config.toml` 与 `hooks.json`, 调 `src/main/adapters/codex/parsers.ts::parseCodexHooks()`。
  - parser 产出的 `Asset.meta` 已包含 `eventType`、`matcher`、`hookType`、`command`、`url`、`server`、`tool`、`prompt`、`model`、`timeout`、`shell`、`async`、`rawHook`、`hookKey`、`canToggleHook`、`toggleStrategy` 等 UI 所需字段。
- hook 启用/禁用:
  - Agent 级状态由 `src/main/engine/hooks-manager.ts` 读写 Claude `disableAllHooks` 与 Codex `features.hooks`。
  - 单 Hook 状态由扫描 meta 驱动, UI 调 `window.api.hooks.setHookEnabled()`。Claude 走软删除 + sidecar 恢复点; Codex 写 `hooks.state[hookKey].enabled`。
- 生命周期 UI:
  - `src/renderer/src/lib/hook-lifecycle.ts` 硬编码 lifecycle stage、event、Claude/Codex 支持差异、管理 action 和风险提示。
  - `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 硬编码 handler 展示字段, 例如 `http -> url`、`mcp_tool -> server.tool`、`prompt/agent -> prompt`、其余走 command。
- plugin registry:
  - `src/shared/types/agent-plugin.ts` 已有 source / asset / health descriptors。
  - `src/main/agent-plugins/registry.ts` 已为 Claude Code / Codex 提供内置 plugin 数据。
  - 当前缺少 hook schema descriptors, 因此 Hooks UI 还不能从 plugin 读取 event / handler type / 字段 schema。

## 外部文档证据

已查官方文档:

- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Codex hooks: https://developers.openai.com/codex/hooks

对设计有影响的事实:

- Claude Code hook handler 类型包含 `command`、`http`、`mcp_tool`、`prompt`、`agent`; 每种类型的必填字段不同。
- Claude Code event 覆盖 session、prompt、tool、permission、subagent、context、environment 等多个生命周期节点, 且部分 event 不支持 matcher。
- Codex hook event 覆盖当前 Berth 已展示的 10 个事件: `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PermissionRequest`、`PostToolUse`、`SubagentStart`、`SubagentStop`、`PreCompact`、`PostCompact`、`Stop`。
- Codex 当前只运行 `type: "command"` handler; `prompt` / `agent` 和 `async: true` 会解析但不会执行。
- Codex 支持 Windows command override: `commandWindows` / `command_windows`。

## 关联与依赖

- `agent-plugin.ts` 可以新增 hook schema descriptor 类型, 不需要改 IPC, 因为 renderer 已通过 `agent-plugins:list` 获取 plugin 数据。
- 本轮只搬“描述数据”。不改 `hooks-manager.ts` 的写入逻辑、不改 parser 读取字段、不改 `health.ts` 运行时检查。
- lifecycle stage 顺序和大块 UI 文案可以暂留 renderer; 但 event 支持与 handler 字段 schema 应先进入 plugin registry, 让后续 UI 有数据源。
- `hook-lifecycle.ts` 的 action 与风险提示仍可保留, 因为这些是 Berth UI 交互策略, 不是 Agent 官方 schema。
- i18n key 不能直接拼接冒号 id。descriptor 生成 helper 需要和 health descriptors 一样输出点分隔 key。

## 验收标准

1. `AgentCapabilityPlugin` 新增 hook schema descriptors, 能表达 event、lifecycle stage、matcher 支持、handler type、主展示字段、必填字段、当前是否运行、字段文案 key 和官方证据 URL。
2. Claude Code 内置 plugin 声明官方 event 与 5 种 handler type, 覆盖当前 Hooks 生命周期表需要的全部 Claude 事件。
3. Codex 内置 plugin 声明当前官方/实现覆盖的 event 与 handler type, 明确只有 `command` runnable, `prompt` / `agent` / async 为 parsed-but-skipped。
4. 现有 parser、hooks manager、health engine 不被迁移或重写。
5. 单元测试能证明 descriptor id、event 覆盖、handler 字段与 i18n key 不漂移。
6. Hooks 页面和 Settings plugin UI 的现有测试继续通过。
7. 当前 work 任务态、全仓 typecheck 和 harness 检查通过。

## 界面质量与交互验收

本任务不做 Hooks 行级 UI 重排, 只让 UI 未来可以从 plugin 读取描述。仍需保证现有 Hooks 页面不增加默认说明噪音, 生命周期侧栏 sticky、健康 hover、恢复中心和行级启用/禁用行为不变。

后续独立 UI 切片建议:

- Hook 行默认只保留 hook type、主目标、scope、enabled / effective 状态、启用/禁用与更多操作。
- matcher、timeout、shell、args、raw JSON、support note、等效来源明细放入 hover/focus 渐进披露。
- 行级非错误状态尽量使用黑白灰 outline, warning/error 只保留淡语义色。

## 未决问题

无。第三方插件 manifest、外部插件加载、hook 写入策略迁移和 Hook 行级视觉改造都不进入本轮。
