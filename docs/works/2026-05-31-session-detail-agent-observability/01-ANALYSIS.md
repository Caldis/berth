# 需求分析 (Explore 产物)

## 现状理解

会话详情页真实链路是:

- renderer: `src/renderer/src/pages/session-detail.tsx`
- hook: `useSessionDetail()` 调 `window.api.sessions.get(id)`
- preload / IPC 契约: `src/shared/types/ipc.ts` 的 `SessionDetailResult`
- main process: `src/main/ipc/handlers.ts` 的 `sessions:get`
- 解析器:
  - Claude Code: `src/main/adapters/claude-code/session-detail.ts`
  - Codex: `src/main/adapters/codex/parsers.ts`

页面现在按纯纵向顺序渲染: metadata -> tool timeline -> loaded assets -> artifacts。信息可见但重点不明确。工具时间线左侧每行自己画一段线, 图标在 flex 行内自然撑开, 多行内容时线段不连续、图标视觉中心也不稳。

页面里的 session 总时长不是 API 时长。Claude 与 Codex metadata 解析器都用当前 transcript / rollout 文件里第一条有效 timestamp 与最后一条有效 timestamp 相减, 结果写入 `summary.duration`。这更接近本地记录跨度, 不是供应商计费时长。Claude Code 官方 `/usage` 也区分 `Total duration (API)` 与 `Total duration (wall)`, 且费用是本地估算、账单以 Console 为准。

工具事件已经有 `startedAt` / `endedAt`, 但 UI 只显示相对开始时间。Claude 工具通常可用 tool_use 与 tool_result 的时间差得到耗时。Codex 的 `response_item` 工具调用也能用 call/output 的 timestamp 计算, 另有部分 output JSON 中包含 `metadata.duration_seconds`; 当前解析器还没有利用它。Codex 的某些 `event_msg` 只有 end 事件, 对这类事件不能伪造耗时。

token 展示使用共享 `TokenUsageDisplay`。`detail` 模式现在同时显示文字明细和下方 legend/分段条, 在会话详情页的 metadata 格子里显得重复。Usage 页也在复用这个组件, 所以不能粗暴删掉全局 detail 文案。

官方调试/观测思路:

- OpenAI Agents SDK tracing 默认记录整体 run、model calls、tool calls、handoffs、guardrails、自定义 spans, 用于调试单次 workflow 和后续 eval 样本。来源: https://developers.openai.com/api/docs/guides/agents/integrations-observability#tracing
- OpenAI Codex telemetry 指标明确包含 turn 端到端时长、TTFT、TTFM、工具调用数、按工具与 success 维度的 `tool.call.duration_ms`、MCP 调用耗时、hook 耗时、token usage。来源: https://developers.openai.com/codex/config-advanced#turn-and-tool-activity
- OpenAI reasoning model 指南建议跟踪 prompt cache 命中 token, 因为 prompt caching 会影响延迟与输入成本。来源: https://developers.openai.com/api/docs/guides/latest-model#using-reasoning-models
- Claude Code Agent SDK observability 把一次 interaction、每个 LLM request、每个 tool invocation 和 hook 作为 spans; tool span 还区分 permission wait 与 execution, 并记录 token、cost、失败位置。来源: https://code.claude.com/docs/en/agent-sdk/observability
- Claude Code monitoring reference 的事件/指标覆盖 cost、token、tool decision、active time、API error、MCP connection、skill activated、compaction 等。来源: https://code.claude.com/docs/en/monitoring-usage

OpenClaw 提到的消息数、吞吐量、工具调用、缓存命中率、错误数/率、平均成本可以作为产品参考; 本任务只实现本地现有 transcript 能稳定推导的部分, 避免把不可靠字段展示成精确数据。

## 关联与依赖

- `TokenUsageDisplay` 是共享组件, Usage 页和 Sessions 列表也在使用。会话详情页去重需要通过可选展示模式解决, 不影响 Usage 页现有测试。
- `SessionToolEvent` 是跨进程共享类型。可新增可选字段, 旧数据仍可渲染。
- i18n 需同步更新 `en.json` / `zh.json`。
- 测试落点:
  - parser: `tests/unit/codex-session-parser.test.ts` 覆盖 Codex output metadata 中的 `duration_seconds`。
  - renderer: `tests/renderer/sessions-pages.test.tsx` 覆盖会话详情信号、工具耗时、token 去重。
- 当前工作区已有别的改动: `AGENTS.md`, i18n, `session-detail.tsx`, `sessions.tsx`, `tests/renderer/sessions-pages.test.tsx`, 以及未跟踪的其它任务目录。本任务提交必须只暂存本任务相关文件。

## 验收标准

1. 会话详情页顶部能快速看到 session 核心信号: 工具调用总数、失败/错误率、平均工具耗时或无数据占位、最慢工具、token/分钟、缓存读占比、费用/分钟。
2. 工具时间线左侧连续线段在多行内容下仍连贯, 图标视觉中心对齐。
3. 每个工具事件展示可用耗时; 无法可靠计算时显示明确占位, 不把 end-only 事件伪装成真实耗时。
4. Codex `custom_tool_call_output` / `function_call_output` 里若包含 `metadata.duration_seconds`, parser 能写入可选 duration 字段供 UI 优先使用。
5. token 详情在会话详情页只保留一种好看的 breakdown 展示; Usage 页原有 detail 文案不被破坏。
6. 页面排版从纯纵向罗列改为更适合开发者扫描的两栏/分区布局, 移动端仍可单列阅读。
7. 有 renderer 和 parser 测试覆盖新增行为。
8. `pnpm typecheck:web`、目标测试、`pnpm harness:check` 通过; 若全量测试受无关工作区影响, 记录边界。

## 未决问题

无。消息数量、真实供应商吞吐量、API duration 与 permission wait 需要更完整的上游 trace/telemetry 数据, 不在本次本地 transcript 推导范围内硬算。
