# 需求分析 (Explore 产物)

## 现状理解

1. 进程边界: 主进程负责本地文件扫描、解析和聚合; 渲染层只能通过 preload 暴露的 IPC API 读取结果。相关边界见 `docs/ARCHITECTURE.md`、`src/shared/types/ipc.ts`、`src/preload/index.ts`。
2. 当前共享数据契约只保留 token 总数:
   - `SessionSummary` 只有 `tokens: number`。
   - `UsageSummary` 只有 `totalTokens: number`, `dailyCosts` 也只表达 cost。
   - `byModel` / `byProject` 只返回 `percentage` 和 `cost`, 没有 token 明细。
3. Claude Code session parser 已经能读到明细字段, 但会在 `parseSessionMeta()` 里相加后只写入 `meta.totalTokens`。已出现的字段包括 `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, 以及 camelCase 变体。
4. Codex session parser 当前主要从 `event_msg.payload.type = token_count` 读取 `total_tokens`; 它的 fallback 递归求和也识别 `input_tokens`, `output_tokens`, `cached_input_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `reasoning_output_tokens`, 但同样只输出总数。
5. Usage 聚合现状:
   - 优先 `usage-data`。
   - 没有 `usage-data` 时用 Claude `stats-cache`。
   - 没有把 session asset 当 fallback, 因此 Codex 视角在没有独立 usage 数据时容易没有用量汇总。
   - `usage:summary` IPC 接收 `days`, 但 `buildUsageSummary()` 当前不使用该参数; 如果本次新增 daily token chart, 需要一并处理时间范围。
6. UI 显示位置:
   - `src/renderer/src/pages/usage.tsx`: 总成本、总 token、daily cost、model/project breakdown。
   - `src/renderer/src/pages/overview.tsx`: 最近会话显示 cost 和 token 总数; 7 日 cost chart。
   - `src/renderer/src/pages/sessions.tsx`: 会话列表显示 cost 和 token 总数。
   - `src/renderer/src/pages/session-detail.tsx`: metadata 区显示 cost 和 token 总数。
   当前没有共享的 token 用量展示组件, 容易出现页面之间文案和格式不一致。
7. 外部价格源调研:
   - `ccusage` 当前源码使用 LiteLLM `model_prices_and_context_window.json` 作为主要价格源, 构建时嵌入精简快照, 运行时可刷新; 解析字段包括 input/output/cache/200k+ tier 等。它还启用 models.dev fallback, 并有少量内置覆盖。
   - `ccusage` 成本计算支持 display/auto/calculate 三种口径: 只显示已有 `costUSD`, 有 `costUSD` 时优先使用否则按 token 估算, 或强制按 token 估算。
   - LiteLLM 原始价格表包含 `input_cost_per_token`, `output_cost_per_token`, `cache_creation_input_token_cost`, `cache_read_input_token_cost`, `output_cost_per_reasoning_token`, image/search/audio 等字段。它是第三方聚合数据, 不等同于模型厂商账单。
   - models.dev API 字段更规整, `cost.input/output/cache_read/cache_write` 以每 100 万 token 美元计价, 适合作为 fallback 或独立 catalog。
   - 价格相关来源: https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json, https://models.dev/api.json, https://github.com/ryoppippi/ccusage/blob/main/rust/crates/ccusage/src/pricing.rs, https://github.com/ryoppippi/ccusage/blob/main/rust/crates/ccusage/src/cost.rs, https://github.com/ryoppippi/ccusage/blob/main/docs/guide/cost-modes.md

## 关联与依赖

1. 数据流:
   - adapter/parser 产出 `Asset.meta`。
   - `AssetScanner` 汇总 assets。
   - IPC handler 把 session asset 转成 `SessionSummary`, 把 assets 交给 `buildUsageSummary()`。
   - renderer hook (`useSessions`, `useUsageSummary`, `useSessionDetail`) 把结果交给页面。
2. 兼容约束:
   - 现有 `tokens` / `totalTokens` 字段要保留, 避免一次性改动所有调用方。
   - 新增 token 明细字段应是 additive contract。
   - 对只有 total 的数据源不能拆分 input/output; 要保留 total 并标记 breakdown 不完整。
3. Agent 差异:
   - Claude Code 有 `usage-data`、`stats-cache`、session transcript 三类来源。
   - Codex 当前主要依赖 session rollout JSONL。
   - `agentView` 过滤发生在 IPC handler 前后, Usage 聚合必须在过滤后的 assets 上保持一致。
4. 成本口径:
   - 真实 `costUSD` 优先级最高。
   - 按价格表推导只能标为 estimate。
   - 缺模型价格、缺 input/output 明细、只有 total 的记录不能强行估算。
   - 本地应用的安全边界是“数据不出本机”; 如后续支持价格表刷新, 请求只能获取公共 catalog, 不携带本地 usage/session/path 信息。
5. 现有架构文档仍写着 v0.1 仅 Claude Code, 但当前源码已有 Codex adapter。本文档按源码现状设计, 不以过期描述限制 Codex 支持。

## 验收标准

1. 共享类型中存在 token 明细契约, 能表达 input/output/cache read/cache creation/reasoning/unknown/total, 并保留现有总数字段兼容。
2. Claude Code session parser 不再丢弃 token 明细; 旧 fixture 的 `totalTokens` 结果保持不变, 同时能断言各分项。
3. Codex session parser 在原始数据含分项时保留分项; 只有 `total_tokens` 时保留 total 并标记 unknown, 不臆造 input/output。
4. Usage 聚合能从 `usage-data`、`stats-cache`、session assets 读取 token 明细, 继续遵守现有优先级, 并能为 Codex-only 视角返回 session fallback 用量。
5. `usage:summary` 的 `days` 参数对 daily cost/token 数据有效, 不继续作为无效参数存在。
6. Usage 页面显示总 token 明细, model/project breakdown 至少显示 token 数与百分比; 成本缺失时不把 0 美元伪装成真实花费。
7. Overview 最近会话、Sessions 列表、Session Detail metadata 都使用统一 token 展示组件或统一 formatter, 至少能看出 input/output 和 total。
8. 计价模型设计保留三种口径: actual (`costUSD`), estimate (catalog + 明细 token), unknown (无法估算); UI 文案能区分真实成本和估算成本。
9. 价格 catalog 使用公开机器可读源时必须记录 source/updatedAt, 支持本地覆盖和缺失模型提示; 不向外发送本地用量数据。
10. 增加单元测试和渲染测试覆盖 token 明细与 UI 展示; `pnpm harness:check`, `pnpm test -- ...`, `pnpm typecheck` 在相关阶段通过。

## 未决问题

无阻塞问题。设计采用以下明确假设:

- 用户提到的“设计 token 显示”按“所有 token 用量显示位置”处理, 不涉及 Tailwind/CSS design tokens。
- 第一轮实现只处理文本 token 计数和文本 token 成本估算; image/audio/search/tool 单次费用先进入价格模型扩展字段, 不在 UI 上伪造金额。
- 对历史数据只做真实可恢复的明细; 只有 total 的旧数据保持 total-only。
