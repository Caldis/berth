# 需求分析 (Explore 产物)

## 现状理解
- 用户可见问题: Sessions 列表里的 Codex 会话标题显示为 `Codex Session 019ebfe7` 这类 fallback, 没有显示真实对话标题。
- 渲染链路: `src/renderer/src/pages/sessions.tsx` 调 `useSessions({ projectPath })`; `useSessions()` 经 preload 调 `sessions:list`; main handler 返回 `getAssetRuntime().listSessions(opts)`。
- 数据链路: `AgentAssetRuntime.listSessions()` 从 snapshot 选 `asset.type === 'session'`, 排序后 `map(toSessionSummary)`; `toSessionSummary()` 的 `title` 直接取 `asset.name`。
- Codex 来源: `CodexAdapter.scanSessions()` 扫 `~/.codex/sessions/**/rollout-*.jsonl` 与 `~/.codex/archived_sessions/**/rollout-*.jsonl`, 每个文件交给 `parseCodexSessionMeta()` 生成 session asset。
- 现有标题逻辑: `parseCodexSessionMeta()` 只在 rollout JSONL 内遇到 `event_msg.payload.type === "thread_name_updated"` 时读取 `thread_name/threadName/name/title`; 否则用 `Codex Session ${sessionId.slice(0, 8)}`。
- 本机样本: 截图对应的 `019ebfe7` rollout 文件没有 `thread_name_updated`; 但 `C:\Users\mail\.codex\session_index.jsonl` 有 `id/thread_name/updated_at` 行, 例如当前任务线程 `019ec0a1-6070-7253-97a4-fb4f2e28d2ad` 对应 `修复 Codex 对话标题识别`。
- Primary-source 证据: openai/codex issue #10462 记录 `${CODEX_HOME}/.codex/session_index.jsonl` 以 `id/thread_name` 保存线程名; issue #16405 说明 rename 会更新 `session_index.jsonl`, 而 SQLite title 可能滞后, 且较新的 resume/list 路径会从 session_index 补 thread name。

## 关联与依赖
- 主要模块:
  - `packages/berth-scan-engine/src/adapters/codex/index.ts`: 枚举 Codex home、sessions、archived_sessions。
  - `packages/berth-scan-engine/src/adapters/codex/parsers.ts`: 解析 rollout JSONL 元数据。
  - `packages/berth-scan-engine/src/engine/session-detail.ts`: `toSessionSummary()` 统一把 asset 转给列表和详情。
  - `packages/berth-scan-engine/src/shared/types/asset.ts`、`src/main/agent-plugins/registry.ts`、`src/renderer/src/components/layout/local-source-copy.ts`: 如果把 `session_index.jsonl` 纳入扫描源声明, 需要同步 source code 与 UI 文案。
- 消费面:
  - Sessions 列表主标题、搜索匹配。
  - Overview recent sessions, 因为同样消费 session summaries。
  - Session detail 顶部标题和 breadcrumb, 因为 `buildSessionDetail()` 也调用 `toSessionSummary()`。
- 约束:
  - 只读用户配置和会话文件; 只能读取 `session_index.jsonl`, 不能修复或写回 Codex 自身 metadata。
  - 不在 renderer 临时读磁盘; 修复应在 adapter 解析层完成, 让 IPC 契约保持 `SessionSummary.title` 不变。

## 任务分类与 debt 校准
- type / maintenance.subtype: bug; maintenance 不适用。
- source.kind / refs: user-request; GH-132。
- debt estimate 修正: 从 net 2 调整到 net 3。
- scope / risk / areas / confidence: cross-process / medium / ui-ux,testability / medium。
- revision: 标题字段从 Codex adapter 进入 session asset, 再经 main IPC 到多个 renderer 消费面, 不是纯单页 UI 修复。

## 验收标准
1. 当 `~/.codex/session_index.jsonl` 包含 `{ id, thread_name }`, 同 id 的 Codex rollout session asset 使用 `thread_name` 作为 `asset.name`, `SessionSummary.title` 不再回退到 `Codex Session <id>`。
2. 当 rollout JSONL 自带 `thread_name_updated`, 现有标题解析仍可用。
3. 当 `session_index.jsonl` 缺失、格式损坏或没有对应 id, 扫描不能失败, 继续使用既有 fallback。
4. active sessions 与 archived_sessions 都能复用同一 Codex home 的 title index。
5. Sessions 列表可见字段不回归: 标题、日期、项目/路径、token、模型、duration、agent、loading、empty、error/stale 状态保持现有契约。
6. 共享数据契约消费面不需要 renderer 特判; Overview recent sessions 与 Session detail 通过 `SessionSummary.title` 自动获得修复。
7. 如果把 `session_index.jsonl` 纳入 source coverage, Agent plugin/source UI 的文案和 descriptor 测试同步更新。

## 界面质量与交互验收
- 现有结构: Sessions 页面是低高度虚拟列表 row, 左侧为项目分组/跳转, 顶部搜索由 PageChrome 提供, row 内主标题加时间/模型元信息、agent chip、token spark。
- 本任务不改视觉布局、组件层级、颜色、间距、响应式或交互控件, 只修正主标题数据。
- 用户路径: 进入 Sessions, 扫描完成或 SWR 缓存刷新后, Codex row 的标题应从 fallback 变为真实 thread name; 搜索框应能按真实标题匹配。
- 风险: title 可能来自用户输入, 需去空白、限制异常长标题, 避免 session_index 中的大段 prompt 直接撑坏列表。Codex upstream issue #15493 也提到 `thread_name` 可能异常长。

## 未决问题
- 无需用户澄清。实现采用只读 `session_index.jsonl` 兜底, 不写回 Codex metadata。
