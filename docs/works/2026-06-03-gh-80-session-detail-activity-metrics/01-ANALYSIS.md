# 需求分析 (Explore 产物)

## 现状理解

当前链路跨 main、shared IPC 类型和 renderer:

1. `src/main/adapters/claude-code/parsers.ts` 的 `parseSessionMeta()` 会从 Claude Code JSONL 里提取 `message.usage`、`Skill` tool use、`mcp__...` tool use 和 `stop_hook_summary`, 写入 session asset meta。
2. `src/main/adapters/claude-code/session-detail.ts` 会为 Claude Code 详情页重建工具 timeline、skill/MCP tool event、file/todo/checkpoint artifacts。
3. `src/main/adapters/codex/parsers.ts` 的 `parseCodexSessionMeta()` 当前只提取 session id、cwd、model、title 和 `token_count`; 它把 `skillsUsed`, `mcpServers`, `hooksFired`, `hookEventCounts` 固定写成空值。
4. `parseCodexSessionDetail()` 已能从 `response_item` 和部分 `event_msg` 建 tool timeline、MCP tool event、patch/web/search artifacts, 但这些 detail 信号没有回流到 session meta。
5. `src/main/ipc/handlers.ts` 的 `sessions:get` 用 `toSessionSummary(asset)` 和 meta 上的 `skillsUsed` / `mcpServers` / `hookEventCounts` 组装 `SessionDetailResult`。如果 meta 是空的, 详情页“加载的资产”也会空。
6. `src/renderer/src/pages/session-detail.tsx` 的 `buildSessionSignals()` 在 renderer 里用 `summary.duration` 计算 `tokenRatePerMinute`; duration 来自 transcript 第一条到最后一条有效 timestamp。文件历史快照、hook summary 或长时间空闲都会拉长这个区间, 让 token rate 变成不稳定的“整段记录速率”。

官方资料限制:

- Claude Code Hooks reference 公开说明 hook 输入会带 `transcript_path`, hook event 有 `Stop` / `PostToolUse` 等生命周期。公开文档可以支撑“hooks 是会话或工具生命周期事件”的展示语义。
- Claude Code 公开 usage 文档和第三方 transcript 文档都说明 `message.usage` 有 `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` 等字段。
- OpenAI/Codex 官方公开文档没有稳定说明本地 rollout JSONL schema; Codex 解析只能以本地样本、现有测试和真实文件容错为依据, 不能声称字段是官方稳定契约。

## 关联与依赖

- `SessionSummary` 是 list、overview、usage、detail 的共享数据形状。改 token/duration 不能破坏列表页和 usage 页已有展示。
- `SessionDetailResult` 当前没有独立的 metric provenance 字段。若在 renderer 里继续直接除以 `summary.duration`, 用户无法知道 token rate 用的是“会话记录跨度”还是“模型活动跨度”。
- `resolveSessionNamedAssets()` 会优先把 session meta 里的名字解析到已扫描资产; 找不到时生成 `scope=session` fallback asset。因此 Codex 只要把 MCP server / skill 名写进 meta, 详情页就能至少显示 session-derived 资产。
- `toHookEvents()` 在没有 `hookEventCounts` 时会把 `hooksFired > 0` fallback 成 `Stop`; 这对旧 Claude meta 可用, 但对 Codex 或未来 Agent 会误导。新解析应优先写 event count, 并避免无来源的默认 event。
- renderer 当前 loaded assets 面板只展示名字和 scope。若识别来自 transcript fallback, UI 没有说明来源; 但本任务先保证识别正确和可测试, 来源解释可在后续更大的信息架构任务里细化。

## 任务分类与 debt 校准
- type / maintenance.subtype: `bug`
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-BUG-session-detail-activity-metrics.md`
- debt estimate 修正: 从 `module / incurred=3 / confidence=low` 调整为 `cross-process / incurred=4 / confidence=medium`。
- scope / risk / areas / confidence: `cross-process` / `medium` / `architecture, testability, ui-ux` / `medium`
- revision: 已写入 `INDEX.md debt.revisions[]`。

## 验收标准

1. Codex session meta 能从 rollout JSONL 的 tool events 中提取 MCP server 名称, 并让 session detail “MCP servers connected” 显示出来。
2. Codex session meta 能从 rollout JSONL 的 skill-like tool events 中提取 skill 名称, 并让 session detail “Skills used” 显示出来。
3. Codex session meta 能从 rollout JSONL 中提取 hook event counts; 无明确 event 时不能把所有 hook 误标成 `Stop`。
4. `sessions:get` 仍能解析已有 Claude session meta, Claude Code 的 skills/MCP/hooks 展示不退化。
5. token rate 的定义必须明确且可测试: 不使用无意义或不可靠的 duration 时显示 unknown; 使用 duration 时标明它基于哪种时间范围。
6. token rate 计算不能被 file-history/checkpoint/hook summary 这类非模型活动 timestamp 拉低。
7. renderer session detail 测试覆盖 token rate unknown / active duration / transcript-derived assets 三类状态。
8. 空态、加载态、错误态和 tab 计数不能因为新增 metric 字段退化。

## 界面质量与交互验收

- 页面结构: Session Detail 目前是 Overview / Timeline / Artifacts 三个 tab, Overview 内有 summary cards、Session signals 和 Loaded Assets。
- 设计系统: 使用 `MetaItem`, `SignalMetric`, `CollapsibleSection`, `ScopeBadge`, `TokenUsageDisplay`; 不需要新增大块说明卡。
- 信息密度: token rate 只是一项辅助指标, 文案要短, 不能把 debug 说明平铺到主视图。
- 主要用户路径: 用户从 session list 点入详情, 在 Overview 先看 token/cost/duration/model, 再看 signals 和 loaded assets。
- 可见状态: 覆盖有 duration、有 tokens 但无可靠 rate、没有 loaded assets、有 transcript-derived fallback assets。
- 交互反馈: Loaded Assets 仍用可折叠 section; 若后续补来源解释, 应放在小 tooltip 或行内 source tag, 不新增大段说明。
- 响应式和可访问性: 当前 tab 和折叠区是按钮/ARIA 友好结构; 本任务避免破坏 tab roles、button focus 和小屏文本截断。

## 未决问题

无。设计可按“Codex session meta 补齐 activity extraction + token rate provenance/active duration”推进。
