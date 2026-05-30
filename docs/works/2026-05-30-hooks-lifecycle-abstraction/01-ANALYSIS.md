# 需求分析 (Explore 产物)

## 外部资料

检索时间: 2026-05-30。按项目规则使用英文关键词, 优先官方 / primary source。

- Codex: https://developers.openai.com/codex/hooks
- Codex config reference: https://developers.openai.com/codex/config-reference
- Codex source docs mirror: https://github.com/openai/codex/blob/main/docs/config.md
- Claude Code hooks reference: https://code.claude.com/docs/en/hooks
- Claude Code hooks guide: https://code.claude.com/docs/en/hooks-guide

补充说明: `openai-docs` skill 要求优先使用 OpenAI developer docs MCP。本机原先没有配置该 MCP, 已执行 `codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp`。当前会话没有热加载出该 MCP 工具, 因此本轮 OpenAI 侧以 developers.openai.com 官方网页和 openai/codex 仓库页面作为依据。

## 外部生命周期差异

Codex 官方文档当前把 hooks 定义为 Codex lifecycle 中运行的确定性脚本。已默认启用, 可由 `[features].hooks = false` 关闭。配置来源包括 `~/.codex/hooks.json`, `~/.codex/config.toml`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`, 也支持 plugin-bundled hooks 和 managed hooks。

Codex 当前公开事件面:

| Codex event | 抽象含义 | matcher | 关键限制 |
|---|---|---|---|
| `SessionStart` | 会话启动 / resume / clear / compact 后注入上下文 | start source | 支持 `additionalContext` |
| `SubagentStart` | 子 agent 启动前后补充上下文 | subagent type | `continue:false` 不阻止子 agent 启动 |
| `UserPromptSubmit` | 用户 prompt 进入模型前 | 无, matcher 被忽略 | 可注入 context 或 block prompt |
| `PreToolUse` | 支持的工具调用执行前 | tool name | 只覆盖 Bash, `apply_patch`, MCP tool；不覆盖 WebSearch 等非 shell / 非 MCP 工具 |
| `PermissionRequest` | Codex 即将请求批准时 | tool name | 只在需要 approval 时触发 |
| `PostToolUse` | 支持的工具产出后 | tool name | 已有副作用无法撤销；拦截覆盖不完整 |
| `PreCompact` | 压缩上下文前 | `manual` / `auto` | 可阻止 compaction |
| `PostCompact` | 压缩上下文后 | `manual` / `auto` | 已完成 compaction |
| `SubagentStop` | 子 agent 即将停止 | subagent type | 可要求子 agent 继续 |
| `Stop` | 主 agent 一轮回复即将结束 | 无, matcher 被忽略 | `decision:block` 表示继续工作, 不是拒绝输出 |

Claude Code 官方 hooks 面更宽。官方 reference 描述了 session cadence、turn cadence、agentic loop cadence, 并在 lifecycle diagram 中列出更多事件: `Setup`, `SessionStart`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `PermissionDenied`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `Stop`, `StopFailure`, `TeammateIdle`, `PreCompact`, `PostCompact`, `SessionEnd`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`, `Notification`, `ConfigChange`, `InstructionsLoaded`, `CwdChanged`, `FileChanged` 等。

Claude 与 Codex 的主要差异:

1. Claude 事件更细。Codex 目前有核心会话 / prompt / tool / permission / compact / subagent / stop 事件, 但没有 Claude 的 `Notification`, `SessionEnd`, `Setup`, `UserPromptExpansion`, `PostToolUseFailure`, `PostToolBatch`, `PermissionDenied`, task / teammate / worktree / cwd / file / instruction change 等事件。
2. 同名事件语义也不总是等价。`PreToolUse` 在 Claude 中覆盖 Bash/Edit/Write/Read/Glob/Grep/Agent/WebFetch/WebSearch/AskUserQuestion/ExitPlanMode/MCP tool 等工具名；Codex 官方明确说它目前只拦截 Bash、`apply_patch` 和 MCP tool, 仍是 guardrail, 不是完整 enforcement boundary。
3. Claude `PostToolUse` 是工具成功后, 另有 `PostToolUseFailure`。Codex `PostToolUse` 文档写明 Bash 非零退出后也会触发, 因此 Codex 把成功/失败后处理合在一个事件里。
4. Claude 支持更丰富的 handler 类型和高级控制: command, http, prompt, agent, mcp_tool 等。Codex 当前只有 `type:"command"` 实际运行, `prompt` 和 `agent` 会被解析但跳过, `async:true` 也会被跳过。
5. Claude 有 `Notification` 这种用户注意力事件；Codex hooks 文档中没有等价事件。Codex 早期的 `notify` 配置不等同于 hooks lifecycle event, 不应混进 hooks 页面作为同类生命周期。
6. 两者都有 `Stop`, `SubagentStop`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, 但 matcher、可阻止性、payload 字段和覆盖范围不同。UI 必须保留 agent-specific support 状态, 不能只显示一个统一事件名。

## 建议抽象层

UI 不应以 vendor event name 作为第一层分组。建议建立 `HookLifecycleStage` 抽象, 每个 stage 下列出各 agent 的原生事件映射、支持状态和限制。

建议阶段:

| 抽象 stage | 含义 | Claude 映射 | Codex 映射 |
|---|---|---|---|
| `session-start` | 会话建立、恢复、清理后初始化上下文 | `Setup`, `SessionStart` | `SessionStart` |
| `user-input` | 用户输入进入 agent 前, 或 slash / prompt 展开前 | `UserPromptSubmit`, `UserPromptExpansion` | `UserPromptSubmit` |
| `tool-before` | 工具调用执行前的策略检查 / 输入改写 | `PreToolUse` | `PreToolUse` |
| `permission` | 需要用户或策略批准时 | `PermissionRequest`, `PermissionDenied`, `Elicitation`, `ElicitationResult` | `PermissionRequest` |
| `tool-after` | 工具执行后反馈、校验、日志 | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` | `PostToolUse` |
| `subagent` | 子 agent / teammate / task 生命周期 | `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` | `SubagentStart`, `SubagentStop` |
| `context-maintenance` | 上下文压缩与规则 / cwd / 文件变更观察 | `PreCompact`, `PostCompact`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged` | `PreCompact`, `PostCompact` |
| `session-stop` | 主 agent 停止、失败、会话结束 | `Stop`, `StopFailure`, `SessionEnd` | `Stop` |
| `environment` | 工作区 / worktree / 通知类外围事件 | `WorktreeCreate`, `WorktreeRemove`, `Notification` | 无 hooks 等价事件 |

每个 stage 需要展示:

- stage label / description: 面向用户的抽象语义。
- native events by agent: `claudeEvents`, `codexEvents`。
- support level: `supported`, `partial`, `unsupported`。
- limitations: 例如 Codex `PreToolUse` 不覆盖 WebSearch, Claude `PostToolBatch` 没有 Codex 等价。
- hook assets: 真实扫描到的 `Asset[]`, 仍按 `meta.eventType` 与 native event 绑定。

## 现状理解

涉及模块:

- 渲染层: `src/renderer/src/pages/capabilities.tsx`
- Agent 视角过滤: `src/renderer/src/lib/agent-view.ts`
- 共享 Asset 模型: `src/shared/types/asset.ts`
- Claude 扫描: `src/main/adapters/claude-code/scanner.ts`, `src/main/adapters/claude-code/parsers.ts`
- Codex 扫描: `src/main/adapters/codex/index.ts`, `src/main/adapters/codex/parsers.ts`
- IPC 统计 / detail 汇总: `src/main/ipc/handlers.ts`
- 文案: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`

当前 `capabilities.tsx` 用固定数组分组:

```ts
const hookEventTypes = [
  'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Stop',
  'SubagentStop', 'Notification', 'PreCompact', 'SessionStart'
]
```

这不是完整 Claude hooks 面, 也不是 Codex hooks 面。页面还会隐藏空组, 所以用户实际看到的数量可能取决于本机配置, 不是完整生命周期。

Claude parser 当前从 `settings.json` 的 `hooks` 字段解析 hook asset, `meta.eventType` 等于原生 event name。Codex adapter 当前 `scanAssets(category)` 只在 `category === 'state'` 时扫描 sessions, `scanAll()` 也只返回 sessions；没有扫描 `~/.codex/hooks.json` 或 `.codex/config.toml` 的 hooks。因此切到 `codex` 视角时 hooks 页即使有 UI 分组, 也没有 Codex hooks asset 数据来源。

## 关联与依赖

1. 抽象生命周期适合放在 renderer 纯数据层, 作为 capabilities 页面展示模型, 不应改共享 Asset 基础类型来硬编码 vendor event。
2. 真实 Codex hooks 展示需要 main adapter 扫描 `~/.codex/hooks.json` / inline `[hooks]`。repo-local `.codex` 扫描涉及当前项目目录来源, 可能和 settings scan directories 任务有关, design 阶段需要决定是否先只做 user-level Codex hooks。
3. 搜索 / scope filter 仍应过滤 `Asset[]`; lifecycle stage 只负责分组和解释, 不应影响通用资产过滤。
4. All 视角需要能展示一个 stage 下 Claude 和 Codex 两列 / 两组 native events, 避免用户以为两个 agent 都支持同一组事件。
5. 用户手册目前写 Hooks Tab 按 8 个事件分组, 后续如果 UI 改为抽象 stage, 需要同步文档。

## 验收标准

1. Hooks 页面不再把固定 Claude/Codex 原生事件名作为顶层生命周期列表, 而是显示更高层的抽象 stage。
2. All 视角能在同一 stage 下区分 Claude 和 Codex 的原生事件、支持状态与限制说明。
3. Claude 视角只展示 Claude 支持的 stage / native event, 且不丢失当前已扫描 hooks。
4. Codex 视角展示 Codex 官方支持的 lifecycle 面；如实现包含扫描, 必须能读取 Codex user-level hooks 配置并生成 `agentId:'codex'` 的 hook assets。
5. Codex 不支持或部分支持的事件必须明确标注, 不能把 Claude-only 事件伪装成 Codex 支持。
6. 搜索、scope filter、agentView filter 与现有 tabs 行为保持不破坏。
7. i18n 同步更新中英文文案。
8. 至少用单元测试覆盖 lifecycle stage 映射和 hooks 分组逻辑；如果改 main adapter 扫描, 需要补 parser 测试。
9. 通过 `pnpm typecheck`, `pnpm test` 或更小范围等价门禁；如涉及 UI, 补浏览器 / Electron 视觉验收截图。

## 未决问题

1. Codex repo-local `.codex/hooks.json` 是否在本轮纳入扫描? 官方支持 repo-local hooks, 但本项目当前 Codex adapter 只有 user-level `~/.codex` 根。若要扫 repo-local, 需要先明确 inspected project roots 来源。
2. 页面是否展示没有实际 hook asset 的 stage? 倾向展示 stage + support 状态, 否则用户仍无法理解 agent 生命周期差异。
3. `Notification` 在当前 UI 已是 Claude event, Codex 无等价 hooks event。需要在 design 阶段确定是否放入 `environment` stage 并标记 Codex unsupported。
