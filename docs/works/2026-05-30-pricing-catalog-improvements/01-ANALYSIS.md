# Explore 记录

## 外部资料与结论

本轮按英文检索官方文档与 primary source。采用结论:

1. 价格主源使用 LiteLLM, models.dev 作为补充。
   - LiteLLM 文档说明 `model_cost` 含 `input_cost_per_token` / `output_cost_per_token`, 且可通过 raw `model_prices_and_context_window.json` 注册或本地使用。
   - models.dev README/API 说明数据以 provider/model 组织, `cost.input/output/cache_read/cache_write/reasoning` 是每百万 token 美元价格, 适合补 provider/model id、能力和上下文限制。
   - ccusage 的 cost modes 使用 LiteLLM 当前价格估算, 也区分 auto / calculate / display 这类口径, 说明我们必须把真实账单和估算成本分开。
2. 字段语义不能跨 provider 硬套。
   - Anthropic 官方 pricing 和 prompt caching 文档明确区分 `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`。cache write 5m 为 base input 1.25x, 1h 为 2x, cache read 为 0.1x。
   - LiteLLM 是 per-token 价格; models.dev 是 per-million-token 价格, 导入时必须统一到 per-token。
   - reasoning tokens 可能由日志单独列出, 也可能已经包含在 output tokens 中。内部估算必须按来源 schema 避免重复计费。

资料 URL:
- https://docs.litellm.ai/docs/completion/token_usage
- https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json
- https://github.com/anomalyco/models.dev
- https://models.dev/api.json
- https://ccusage.com/guide/cost-modes
- https://github.com/ryoppippi/ccusage/blob/main/rust/crates/ccusage/src/pricing.rs
- https://github.com/ryoppippi/ccusage/blob/main/rust/crates/ccusage/src/cost.rs
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching

## 现状理解

涉及模块:
- shared: `src/shared/types/asset.ts` 定义 `TokenUsageBreakdown`, `CostSource`, `UsageSummary`, `SessionSummary`。
- main: `src/main/engine/pricing/*` 已有最小 `ModelPricing`, 内置一条 Claude Sonnet 4 价格, `resolveUsageCost()` 能返回 actual / estimated / unknown。
- main: `src/main/engine/usage.ts` 汇总 usage-data / stats-cache / session fallback。
- renderer: `src/renderer/src/pages/usage.tsx`, `overview.tsx`, `sessions.tsx`, `session-detail.tsx`, `token-usage-display.tsx` 显示成本和 token。
- IPC: `usage:summary` 支持 `days` 和 `agentView`, 但 Usage 页面现在没有传 `agentView`。

## 当前已验证问题

1. `stats-cache.dailyModelTokens` 聚合有日期语义错误: 当前 helper 返回 `model -> tokens`, 之后却作为 `date -> tokens` 输出, 会把模型名当日期。
2. `buildUsageSummary()` 只要发现任意 `usage-data`, 就完全跳过 stats-cache / session fallback。`agentView=all` 下如果 Claude 有 usage-data、Codex 只有 session, Codex 用量会漏掉。
3. Usage 页面没有传全局 `agentView`, 与侧栏过滤不一致。
4. byModel/byProject 在有 cost 时 `percentage` 按 cost 算, 但 UI 同时展示 tokens 和百分比, 语义不清。token breakdown 场景应按 tokens; spend share 后续另加字段。
5. `TokenUsageDisplay` 没显示 `unknownTokens`; total-only 或 partial unknown 数据无法向用户解释差额。
6. 成本口径只在 Usage summary 上有 `costSource`; model/project/session 级别缺少 costSource, 也没有 `pricingMisses` 列表, UI 无法给出未命中模型和原因。
7. 价格 catalog 当前是手写内置 seed, 没有生成脚本、元数据、local override 文件格式或转换校验。
8. `resolveUsageCost()` 有真实成本时直接返回 actual, 无法同时输出 estimate/delta, 因而不能做“真实账单 vs 当前价格表估算”的差异提示。

## 关联与依赖

- parser 写入 `Asset.meta.tokenUsage` / `totalCost` / `model` / `project`。
- IPC handler 过滤 assets 后调用 `buildUsageSummary()`。
- `UsageSummary` 是 renderer 唯一数据源; 若 miss reason / costSource 不在这里输出, UI 只能猜。
- local override 和 generated catalog 应该在 main/pricing 层加载, renderer 不做模型字符串匹配。
- 运行时默认离线使用内置 catalog; 更新脚本应是开发/CI 工具, 不是用户打开 Usage 页时联网。

## 验收标准

1. pricing catalog 有可重复生成的内置 snapshot, 包含 sourceUrl、fetchedAt / updatedAt、source 口径; LiteLLM per-token 与 models.dev per-million 导入不会混淆。
2. local override 有明确文件格式和 loader, 优先级高于内置 snapshot。
3. model normalization 支持 provider 前缀、Bedrock/区域前缀、受控 alias, 不做无标记的任意 fuzzy match。
4. usage 聚合不再漏混合 agent 来源; stats-cache daily token 日期正确; Usage 页面遵守 `agentView`。
5. token percentage 在 token 展示区域按 tokens 计算, 不被 cost 口径污染。
6. unknown tokens 在 compact/detail/tooltip 中可见, 不伪装成 input/output。
7. `UsageSummary` 输出 model/project 级 `costSource` 和 `pricingMisses`。
8. UI 能显示 cost source badge、unknown pricing notice、pricing gaps 列表; unknown 不显示 `$0.00`。
9. 有真实成本时可同时计算估算值并输出 delta, UI 能提示 actual vs estimated 差异, 但真实成本仍优先。
10. 所有新增逻辑有单元/渲染测试; 不依赖运行时联网。

## 未决问题

无 PRD 级阻塞。第一轮落地建议把“生成脚本 + local override + 汇总/UI 准确性”做完; 运行时联网刷新和 CI 定时 PR 可作为后续增强, 不阻塞当前实现。
