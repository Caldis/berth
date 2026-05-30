# 需求分析 (Explore 产物)

## 现状理解

1. 数据入口仍在主进程。Renderer 通过 `window.api.usage.summary({ days, agentView })` 调用 `usage:summary`, handler 先按 `agentView` 过滤资产, 再调用 `buildUsageSummary()`。
2. `buildUsageSummary()` 当前按 `agentId` 分组, 每个 agent 内按 `usage-data > stats-cache > session` 选最好的来源, 再合并成一个 `UsageSummary`。
3. token 明细已进入共享契约: `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `reasoningOutputTokens`, `unknownTokens`, `totalTokens`, `hasBreakdown`。
4. 计价当前使用 `resolveUsageCost()`:
   - 有 `actualCost` 时优先展示真实成本。
   - 没有真实成本时, 用 catalog + token 明细估算。
   - 缺模型、缺 token 明细、缺 cache/reasoning 价格时返回 `unknown` 和 `PricingMissReason`。
5. pricing catalog 已有内置快照, `catalog.generated.ts` 含 `generatedAt` 和源列表, 但这些元信息未暴露到 `UsageSummary` 或 UI。
6. Usage 页目前有一个页面内 `normalizeUsageSummary()` 兜底, 用于避免 legacy IPC 返回缺字段白屏。这是渲染层补丁, 不是共享边界契约。
7. Usage 页的 pricing gap 目前只能看到数量和模型名, 不能知道缺的是模型价格、token 明细还是具体价格分量, 也没有 local override 示例。
8. Usage 页的 IPC 请求失败被 `.catch(() => {})` 静默吞掉; render 级异常也没有 route-level error boundary, 所以页面仍可能白屏。

## 官方文档依据

1. OpenAI Pricing: https://openai.com/api/pricing/ 和 https://developers.openai.com/api/docs/models/compare
   - 官方价格按 Input / Cached input / Output 的每 1M token 价格展示。
   - 不同 processing mode 可能影响价格, 例如 Batch、Priority、Data residency。
2. OpenAI Responses API usage: https://platform.openai.com/docs/api-reference/responses/object
   - usage 包含 `input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens`, `output_tokens_details.reasoning_tokens`, `total_tokens`。
3. OpenAI Reasoning models: https://platform.openai.com/docs/guides/reasoning
   - reasoning tokens 不可见, 但占上下文窗口, 并按 output tokens 计费。
4. Anthropic Pricing: https://platform.claude.com/docs/en/about-claude/pricing
   - 官方价格按 Base Input Tokens / 5m Cache Writes / 1h Cache Writes / Cache Hits & Refreshes / Output Tokens 展示。
5. Anthropic Prompt Caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
   - 5m cache write 为 base input 的 1.25x, 1h cache write 为 2x, cache read 为 0.1x。
   - 总输入应按 `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` 计算。
6. Anthropic Messages API: https://platform.claude.com/docs/en/api/messages
   - `usage` 是 billing 和 rate-limit 的依据; token count 不保证和可见请求/响应一一对应。
7. Gemini Pricing: https://ai.google.dev/gemini-api/docs/pricing
   - 价格随 Free/Paid、Standard/Batch、模型、输入/输出、context caching、storage 等条件变化。
8. Gemini Context Caching: https://ai.google.dev/gemini-api/docs/caching
   - Gemini 有 implicit caching 和 explicit caching; explicit caching 还涉及 TTL/storage 成本。
9. Gemini Billing: https://ai.google.dev/gemini-api/docs/billing
   - Gemini billing 口径包含 input token count、output token count、cached token count、cached token storage duration。

## 关联与依赖

1. Shared 类型是主进程、preload、renderer 的共同契约。`UsageSummary` 若增加字段, 需要同步:
   - `src/shared/types/asset.ts`
   - `src/shared/types/ipc.ts`
   - `src/preload/index.ts`
   - `src/preload/index.d.ts`
2. 主进程仍是价格匹配和 cost mode 的唯一计算方。Renderer 不应拿完整 catalog 自行计算价格。
3. `pricing` 模块当前能返回匹配到的 `ModelPricing`, 但 `usage` 聚合阶段没有把 source/sourceUrl/updatedAt 等解释性信息汇总进 UI 契约。
4. `loadLocalPricingOverrides()` 目前只有纯函数和测试, 没有运行时 override 文件入口。因此第一轮只能给 override JSON 示例, 不能做“打开/保存 override 文件”按钮。
5. cost mode 会改变 `totalCost`, `dailyCosts`, `byModel.cost`, `byProject.cost` 的语义。必须保证总数、图表和列表用同一口径, 不能只改总卡片。
6. route-level ErrorBoundary 可以只保护 Usage 页面, 不影响侧边栏、搜索和其它页面。
7. 本次任务不处理 Gemini storage / modality / Vertex AI 的完整计费模型。官方文档显示这些口径需要更多上下文, 缺字段时应保持 `unknown` 或明确标为估算。

## 验收标准

1. `UsageSummary` 有共享归一化 helper, 主进程 IPC 返回和 renderer 接收都不会因 legacy 缺字段白屏。
2. `usage.summary` 支持 `costMode = auto | actual | estimated`, 且总数、daily、model、project 成本口径一致。
3. 计价结果能说明当前金额来源: actual / estimated / mixed / unknown, 使用了哪些 pricing source, catalog 生成时间和 source URL。
4. pricing gap 能按 reason 给出可操作说明; `missing-model-pricing` 和 `missing-price-component` 至少能显示 local override JSON 示例。
5. Usage 页面显示 token 结构, 至少能看到 input/output/cache/reasoning/unknown 的占比或分量, 不只显示总数。
6. Usage 页 IPC 失败显示错误态; render 异常由页面级 ErrorBoundary 接住, 不让整个 app 白屏。
7. Renderer 不接收完整 pricing catalog, 不在 UI 层重算价格。
8. 自动化测试覆盖 cost mode、summary normalization、pricing explanation、pricing gap 文案和 Usage 错误边界。
9. `pnpm harness:check`, 相关单测, `pnpm typecheck` 通过。若运行真实 UI, Usage 导航不能白屏。

## 未决问题

无阻塞问题。第一轮明确不做运行时联网刷新价格表, 不做 override 文件写入, 不完整支持 Gemini storage/modality 计费。
