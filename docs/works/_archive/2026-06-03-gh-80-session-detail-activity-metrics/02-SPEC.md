# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 session detail 的 activity metric 字段, 不改变 session list 的 `SessionSummary` 基础形状。

```ts
export type SessionTokenRateSource = 'usage-events' | 'unavailable'

export interface SessionActivityMetrics {
  tokenRatePerMinute: number | null
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionTokenRateSource
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
}

export interface SessionDetailResult {
  // existing fields...
  activityMetrics: SessionActivityMetrics
}
```

语义:

- `usage-events`: token rate 用有 token usage / token_count 的结构化记录时间范围计算。
- `unavailable`: token 总量存在但没有两个以上可计算间隔的 usage 事件, 或时间戳无效; UI 显示 `—`, 不用整段 transcript duration 兜底。
- `tokenRatePerMinute = totalTokens / (tokenRateDurationSeconds / 60)`, 只在 duration > 0 时返回数字。
- parser 在 session asset meta 中写入 `usageStartedAt`, `usageEndedAt`, `usageDuration`; `sessions:get` 负责转换为 `activityMetrics`。

Codex session meta 提取规则:

- 只读取结构化 `payload.type`, `payload.name`, `payload.arguments` / `args` / `input`, `event_msg.payload.type` 等字段。
- MCP: tool name 形如 `mcp__<server>__<tool>` 时提取 `<server>`。
- Skill: tool name 为 `Skill`, `skill`, `load_skill`, `use_skill` 或 `skill__<name>` 时, 从参数 `skill`, `skill_name`, `name` 读取 skill 名; 不从工具输出文本提取。
- Hooks: 仅当 `event_msg.payload.type` 或 tool name 明确是 hook 事件时计数; 优先读 `hook_event_name`, `hookEventName`, `event`, `event_name`, `hookEvent`, 否则用结构化事件类型本身。不能把无来源的 hook count fallback 为 `Stop`。

## 任务分类与 debt
- type / maintenance.subtype: `bug`
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-BUG-session-detail-activity-metrics.md`
- debt.estimate: `incurred=4 net=4`, `cross-process`, `risk=medium`, areas=`architecture,testability,ui-ux`。
- debt.final 预期: parser 和 IPC 契约补齐后预计 `repaid=3 net=1`; 若引入新的 session metric helper 且测试完整, 风险降为 low。
- revisions: explore 已写入 INDEX。
- Project 字段同步: design 产物完成后运行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-80-session-detail-activity-metrics`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/shared/types/ipc.ts`
  - 增加 `SessionActivityMetrics` / `SessionTokenRateSource`。
  - `SessionDetailResult` 增加 `activityMetrics`。
- `src/main/ipc/handlers.ts`
  - 新增 `toSessionActivityMetrics(summary, asset)`。
  - `sessions:get` 返回 `activityMetrics`。
  - `toHookEvents()` 改为只在 `hookEventCounts` 存在时按事件输出; 旧 meta 的 `hooksFired` fallback 只保留给 Claude Code, 避免 Codex 被默认显示为 `Stop`。
- `src/main/adapters/claude-code/parsers.ts`
  - 在读取 `message.usage` 时记录 usage event 的 first/last timestamp, 写入 `usageStartedAt`, `usageEndedAt`, `usageDuration`。
  - file-history snapshot / hook summary 不参与 usage duration。
- `src/main/adapters/codex/parsers.ts`
  - 在 `parseCodexSessionMeta()` 中记录 token_count usage event first/last timestamp。
  - 复用 detail parser 的结构化 tool 读取逻辑或提取共享 helper, 读取 MCP server / skill / hook event counts。
  - 不扫描 output 文本, 不解析命令输出里出现的文件内容。
- `src/renderer/src/pages/session-detail.tsx`
  - `buildSessionSignals()` 改用 `detail.activityMetrics.tokenRatePerMinute`。
  - `SignalMetric` 增加短 `detail` 文案显示 rate source: `Usage events` / `Not enough timing data`。
- `src/renderer/src/i18n/locales/{en,zh}.json`
  - 增加 token rate source 的短文案。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增大说明卡; token rate 仍在 Session signals 网格内, 只加一行短来源 detail | renderer 测试 + Electron 实测 |
| 组件选择 / 设计系统一致性 | 复用 `SignalMetric`, `LoadedAssetsPanel`, `ScopeBadge`; 不引入新组件层级 | renderer 测试检查文本和 tab 结构 |
| 交互反馈 / 状态切换 | 有可靠 usage duration 时显示 `tok/min`; 不可靠时显示 `—` 和短原因 | renderer 测试覆盖两种状态 |
| loading / empty / error / disabled / focus | 不改变页面 loading/empty/error 入口; loaded assets 空态继续显示 | 现有 renderer 测试 + 新增断言 |
| 响应式 / 可访问性 / 键盘可达 | 不改 tab roles 和折叠按钮; 文案短, 避免小屏溢出 | renderer 测试 + Electron 截图 |
| 文案 / i18n / 数字和路径格式 | 英中增加 `Usage events` / `Not enough timing data`; token rate 继续用 `formatRate` | typecheck + renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Claude usage duration 忽略 file-history / hook summary 后续 timestamp | unit | `tests/unit/session-meta-parser.test.ts` | `pnpm vitest run tests/unit/session-meta-parser.test.ts` | 不适用 |
| Codex session meta 提取 MCP / skill / hook event counts / usage duration | unit | `tests/unit/codex-session-parser.test.ts` | `pnpm vitest run tests/unit/codex-session-parser.test.ts` | 不适用 |
| `sessions:get` 返回 activityMetrics, Codex hook 不默认 fallback 为 Stop | renderer 或 main helper 测试 | `tests/renderer/sessions-pages.test.tsx` 或现有 unit | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| Session detail token rate 使用 activityMetrics, unknown 状态不显示伪精度 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 最终回归 | harness / typecheck / tests | 多文件 | `pnpm typecheck`; `pnpm test`; `pnpm harness:check` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Codex session meta activity extraction | 1, 2, 3 |
| `SessionActivityMetrics` 和 usage-event token rate | 5, 6 |
| Claude parser usage window | 4, 6 |
| renderer token rate source detail | 5, 7, 8 |
| 测试矩阵和最终回归 | 1-8 |
