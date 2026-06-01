# 需求分析 (Explore 产物)

## 现状理解

Hooks UI 目前仍主要由 renderer 本地常量驱动:

- `src/renderer/src/pages/capabilities.tsx:892` 只把 `assets`、`agentView`、`search`、`scope` 传给 `HooksLifecycleView`, 没有读取或传入 Agent Capability Plugin。
- `src/renderer/src/hooks/use-ipc.ts:196` 已有 `useAgentCapabilityPlugins()`, 但当前只在 Settings 页面使用。
- `src/renderer/src/lib/hook-lifecycle.ts:107` 静态维护 9 个生命周期阶段、Claude/Codex 事件列表、support 状态和限制提示。
- `src/renderer/src/lib/hook-lifecycle.ts:322` 用静态 `stageByEvent` 把 hook asset 归入阶段。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx:751` 调 `hookDisplayDetails()` 生成 Hook 行展示。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx:923` 仍按 `hookType` 分支选择主字段: `http -> url`, `mcp_tool -> server.tool`, `prompt/agent -> prompt`, 其他走 `command / commandWindows / name`。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx:935` 固定展示 `ifCondition`、`timeout`、`statusMessage`、`commandWindows`、`args`、`shell`、`async`、`asyncRewake`、`model`。
- `tests/unit/hook-lifecycle.test.ts:30` 直接断言静态 Claude/Codex 官方事件列表。
- `tests/renderer/hooks-lifecycle-view.test.tsx:192` 覆盖 type-specific metadata 和 raw JSON; toggle、recovery、health hover 也都集中在同一个测试文件里。

插件侧已经具备本轮所需数据:

- `src/shared/types/agent-plugin.ts:118` 定义 `AgentCapabilityPluginHookEventDescriptor`, 可表达 event type、stage、support、matcher 支持和官方证据 URL。
- `src/shared/types/agent-plugin.ts:138` 定义 `AgentCapabilityPluginHookHandlerDescriptor`, 可表达 handler type、runMode、field schema 和 primary fields。
- `src/main/agent-plugins/registry.ts:417` 声明 Claude Code hook schema。
- `src/main/agent-plugins/registry.ts:513` 声明 Codex hook schema。
- `src/main/agent-plugins/registry.ts:553` 已把 Codex `prompt` / `agent` 标成 `parsed-only`。

## 外部文档证据

已查官方文档:

- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Codex hooks: https://developers.openai.com/codex/hooks

对本任务有影响的事实:

- Claude Code hook 配置是 event -> matcher group -> handler 三层结构。handler 类型包含 `command`、`http`、`mcp_tool`、`prompt`、`agent`。
- Claude Code matcher 支持按事件变化: tool / permission 相关事件匹配 `tool_name`; `UserPromptSubmit`、`PostToolBatch`、`Stop`、`TaskCreated`、`TaskCompleted`、`WorktreeCreate`、`WorktreeRemove`、`CwdChanged` 等不支持 matcher。
- Codex 当前只执行 `type: "command"` handler。`prompt`、`agent` 会被解析但跳过, `async: true` 也会被跳过。
- Codex 支持 Windows command override: `commandWindows` 或 TOML 中的 `command_windows`。

## 关联与依赖

- 最小改动不需要新增 IPC。Renderer 可以复用现有 `agent-plugins:list` preload API 和 `useAgentCapabilityPlugins()`。
- `hook-lifecycle.ts` 不应删除本地 stage 顺序、标题、摘要、建议操作和风险提示。它们是 Berth 的 UI 组织方式, 不是 Agent 官方 schema。
- event support 与 handler 字段选择可以优先从 plugin `hookSchema` 读取; 若插件数据加载失败或缺字段, 必须回退到当前静态逻辑, 避免 Hooks 页面空白。
- `hooks-manager.ts`、Claude/Codex parser、health engine 本轮不迁移。启用/禁用、恢复中心、健康检查仍走现有路径。
- descriptor 的 `labelKey` / `descriptionKey` 目前没有完整 i18n 文案, UI 不应直接裸渲染这些 key。字段名可用现有 `capabilities.hooks.config.*` 作为已知字段 fallback, 未知字段展示原字段名。
- Tests 需要同时覆盖 schema 存在和 schema 缺失两种路径, 保证第三方或未来插件 schema 不完整时 UI 仍可读。

## 验收标准

1. Capabilities Hooks tab 能读取 Agent Capability Plugin 列表, 并把 hook schema 传给 Hooks 生命周期视图。
2. Hooks 生命周期分组优先使用 plugin event descriptor 的 `stageId` / `support` / `matcherSupported`; schema 缺失时回退到当前静态 stage model。
3. Hook 行主展示字段优先使用 handler descriptor 的 `primaryFieldNames`, 支持 `command`、`url`、`server + tool`、`prompt`、`commandWindows` 等常见组合。
4. Hook 行能展示 handler runMode, 尤其是 Codex `prompt` / `agent` 的 `parsed-only`, 但不把它做成错误状态。
5. Hook 行继续提供 raw JSON 详情和复制按钮, 不增加默认说明噪音。
6. 现有启用/禁用、恢复中心、健康 hover、等效来源、风险提示和 action menu 行为保持不变。
7. `tests/unit/hook-lifecycle.test.ts`、`tests/renderer/hooks-lifecycle-view.test.tsx`、必要的 Capabilities renderer 测试覆盖 schema-driven 行为和 fallback 行为。
8. `pnpm typecheck`, 目标 renderer/unit tests, `pnpm harness:check --work docs/works/2026-06-02-gh-28-hooks-ui-schema-driven-presentation` 通过。

## 界面质量与交互验收

现有 Hooks 页面结构:

- 顶部保留筛选提示和恢复中心。
- 主体是左侧 sticky 生命周期侧栏 + 右侧阶段列表。
- 生命周期侧栏已经把健康检查合并为 hover/focus 状态 tag。
- 每条 Hook 行默认展示 type、主字段、scope、enabled/effective 状态、agent tag、matcher、配置摘要、path、raw JSON、support note、风险提示、启用/禁用按钮和 action menu。

本轮 UI 目标:

- 保持黑白灰为主的克制风格, 只给 warning/error/success 保留必要语义色。
- 不新增卡片套卡片; Hook 行仍使用当前列表结构。
- 高频信息直接可见: type、主字段、scope、enabled/effective 状态、启用/禁用。
- 低频信息继续渐进展示: raw JSON 用 details, action menu 用 details, 健康状态用 hover/focus。
- `parsed-only` 应作为小型中性色或轻 warning tag 展示, 文案简短, 不占用主字段位置。
- 长 command、URL、prompt、Windows command override 必须换行或截断得当, 不撑破行布局。
- keyboard focus 必须能打开 raw JSON、action menu、健康 tooltip 和按钮。

## 未决问题

无需要用户确认的问题。

不进入本轮:

- 插件 schema 反向驱动 parser 或 health engine。
- 第三方插件 manifest 加载。
- Hook 写入策略、冲突处理和恢复点格式重构。
- 大范围视觉主题替换。
