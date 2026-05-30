# Explore Analysis

## 现状理解

1. 主进程只挂了 `ClaudeCodeAdapter`。`AssetScanner` 从一个 adapter 扫描资产, `sessions:list` 再从 `Asset.type === "session"` 里取会话。
2. 会话列表和详情通过 IPC 走 `src/shared/types/ipc.ts`。渲染层不能直接读本地文件, 所以 Codex session 兼容必须在主进程 adapter 和 parser 中完成。
3. Claude Code 的 session asset 已经能从 JSONL 里读出标题、项目路径、时间、模型、usage、Skill、MCP 和 Stop hook 摘要。但详情页现在只展示聚合字段, 没有按执行顺序展示工具调用, plans/todos/files/checkpoints 也没有从 transcript 回填。
4. 侧边栏现在只有 Logo 和应用名, 没有全局 agent 视角状态。Overview/Sessions 通过 `useSessions()` 拉取主进程 session list, Instructions/Capabilities 直接使用 store 中的全部 assets。
5. 公开文档边界:
   - Anthropic 官方文档明确了 Claude Code hooks 事件、MCP 工具命名 `mcp__<server>__<tool>`、subagent 配置与工具权限。
   - OpenAI 官方文档没有稳定描述本地 `~/.codex/sessions` 作为产品 API；OpenAI Codex 仓库源码和 issue 中能看到 rollout JSONL 形态。Codex parser 必须按“宽容读取、字段缺失即未知”的方式处理。

## 关联与依赖

1. `src/main/engine/scanner.ts` 需要从单 adapter 改为多 adapter 聚合, 并保持 stats/search 使用同一批资产。
2. `src/main/adapters/codex/*` 只负责读取 Codex 本地 session 文件, 不扫描 Claude Code 专属的 Skills/MCP/Hooks 配置。
3. `src/shared/types/asset.ts` 需要增加 `AgentView` 与 session summary 的 `agentId`, 让渲染层可以按 all/claude/codex 过滤。
4. `src/shared/types/ipc.ts` 需要扩展 session detail: `toolTimeline` 和结构化 `artifacts`, 同时保留旧字段兼容现有页面。
5. `src/main/ipc/handlers.ts` 负责根据 session 所属 agent 调对应解析器, 并在 `sessions:list` 支持 `agentView`。
6. `src/renderer/src/stores/app.ts` 保存当前 `agentView`; `sidebar.tsx` 渲染 dropdown; `overview.tsx`、`sessions.tsx`、配置页用同一过滤规则。

## 验收标准

A1. 扫描结果同时包含 Claude Code 与 Codex session, 单个 adapter 读取失败不阻断另一个 adapter。
A2. `sessions:list` 支持 `agentView: all | claude | codex`, overview 和 session 页会随侧边栏 dropdown 改变。
A3. 侧边栏 Logo 右侧有 agent 视角 dropdown, collapsed 状态不破坏布局。
A4. Session summary 暴露 `agentId`, 日期、路径、token、cost 的未知值继续安全显示, 不出现 Invalid Date。
A5. Claude session detail 从 transcript 解析工具时间线, 能识别内置工具、Skill、MCP、hook、文件相关工具, 并按出现顺序展示。
A6. Codex session detail 从 rollout JSONL 解析 session 元数据和工具时间线, 对坏 JSON、锁文件、缺失字段容错。
A7. 详情页产物区不再固定空: plans、todos、files、checkpoints 从 transcript/rollout 中回填, 没有数据时显示空态。
A8. 新增和修改逻辑有单元测试或渲染测试覆盖, 并通过 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm harness:check`。

## 未决问题

无阻塞项。Codex rollout 本地格式不是稳定公开 API, 本轮按本机样本和 OpenAI 仓库源码做经验性兼容, UI 中缺失字段显示未知值。
