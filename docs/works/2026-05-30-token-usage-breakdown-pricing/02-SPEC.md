# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

### Token 明细

在 `src/shared/types/asset.ts` 增加:

```ts
export interface TokenUsageBreakdown {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  reasoningOutputTokens: number
  unknownTokens: number
  totalTokens: number
  hasBreakdown: boolean
}
```

语义:
- `totalTokens` 永远是展示和排序使用的总数。
- `unknownTokens` 表示只有总数、无法归类到 input/output/cache/reasoning 的 token。
- `hasBreakdown=false` 表示不能展示 input/output 比例, 只能展示 total。
- 所有字段为 number, 默认 0, 便于跨进程 JSON 传递。

扩展现有类型:
- `SessionSummary.tokens` 保留为 `tokenUsage.totalTokens` 的兼容别名。
- `SessionSummary.tokenUsage: TokenUsageBreakdown`。
- `UsageSummary.totalTokens` 保留为 `tokenUsage.totalTokens` 的兼容别名。
- `UsageSummary.tokenUsage: TokenUsageBreakdown`。
- `UsageSummary.dailyTokenUsage: { date: string; tokenUsage: TokenUsageBreakdown }[]`。
- `UsageSummary.byModel[]` 增加 `tokens: number` 和 `tokenUsage: TokenUsageBreakdown`。
- `UsageSummary.byProject[]` 增加 `tokens: number` 和 `tokenUsage: TokenUsageBreakdown`。

`Asset.meta` 继续允许宽松数据, 但主进程输出 session asset 时统一写:
- `meta.totalTokens`
- `meta.tokenUsage`

### 成本与价格

成本结果不混用真实账单和估算:

```ts
export type CostSource = 'actual' | 'estimated' | 'mixed' | 'unknown'
```

第一轮可先在 `UsageSummary` 上增加 `costSource`, 后续细化到 model/project/session。规则:
- 有 `costUSD` / `totalCost` 的记录为 actual。
- 无真实成本但模型价格 + token 明细完整时为 estimated。
- 同一聚合桶内同时有 actual 和 estimated 时为 mixed。
- 无成本且无法估算时为 unknown, UI 不显示 `$0.00` 当作真实花费。

价格 catalog 内部格式:

```ts
export interface ModelPricing {
  model: string
  provider?: string
  inputCostPerToken: number
  outputCostPerToken: number
  cacheReadInputCostPerToken?: number
  cacheCreationInputCostPerToken?: number
  reasoningOutputCostPerToken?: number
  source: 'litellm' | 'models.dev' | 'local'
  sourceUrl?: string
  updatedAt?: string
}
```

采用顺序:
1. 本地覆盖表。
2. 内置 LiteLLM 快照。
3. 可选 models.dev fallback。
4. 未命中则 unknown。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

### Shared

- `src/shared/types/asset.ts`
  - 增加 `TokenUsageBreakdown`, `CostSource`。
  - 扩展 `SessionSummary`, `UsageSummary`。
- `src/shared/token-usage.ts`
  - `emptyTokenUsage()`
  - `normalizeTokenUsage()`
  - `addTokenUsage()`
  - `tokenUsageTotal()`
  这些函数不依赖 Node, 主进程和渲染层都可使用。

### Main process

- `src/main/adapters/claude-code/parsers.ts`
  - 用 helper 读取 message usage。
  - 累加后写 `meta.tokenUsage` 和 `meta.totalTokens`。
- `src/main/adapters/codex/parsers.ts`
  - 对 `token_count` 先尝试分项读取。
  - 只有 total 时写 `unknownTokens=totalTokens`, `hasBreakdown=false`。
- `src/main/engine/usage.ts`
  - `tokenTotal()` 改为基于 `TokenUsageBreakdown`。
  - `summarizeUsageData()` 和 `summarizeStatsCache()` 返回 token 明细。
  - 增加 session fallback, 用于没有 usage-data/stats-cache 的 Codex 或其他 agent。
  - 引入 `days` 参数并过滤 daily 数据。
- `src/main/ipc/handlers.ts`
  - `toSessionSummary()` 输出 `tokenUsage`。
  - `usage:summary` 调用 `buildUsageSummary(assets, { days })`。
- `src/preload/index.d.ts`
  - 类型随 shared contract 自动更新; 如必要补显式 import。

### Renderer

- `src/renderer/src/components/shared/token-usage-display.tsx`
  - compact 模式: `1.2M tok` + 次要文本或 tooltip 显示 `In / Out / Cache / Reasoning`。
  - detail 模式: 用短行展示分项, 不引入大卡片嵌套。
  - total-only 数据显示为 `1.2M tok` 并标记 breakdown unavailable, 不显示假 input/output。
- 替换位置:
  - `src/renderer/src/pages/overview.tsx`
  - `src/renderer/src/pages/sessions.tsx`
  - `src/renderer/src/pages/session-detail.tsx`
  - `src/renderer/src/pages/usage.tsx`
- i18n:
  - `usage.inputTokens`, `usage.outputTokens`, `usage.cacheTokens`, `usage.reasoningTokens`, `usage.unknownTokens`, `usage.estimatedCost`, `usage.actualCost`。

### Pricing 后续接入点

- `src/main/engine/pricing/`
  - `catalog.ts`: 读取内置 catalog + local override。
  - `estimate.ts`: 根据 `ModelPricing` 和 `TokenUsageBreakdown` 计算 estimate。
  - `model-match.ts`: 处理模型别名和 provider 前缀, 不在 UI 层做字符串匹配。
- 内置 catalog 更新建议通过脚本生成, 不在运行时自动改写本地文件。

## 测试策略

1. Unit: `tests/unit/session-meta-parser.test.ts`
   - Claude fixture 断言 total 仍为 38。
   - 新增断言 input=10, output=5, cacheRead=20, cacheCreation=3。
2. Unit: `tests/unit/codex-session-parser.test.ts`
   - total-only `token_count` 断言 unknownTokens=42, hasBreakdown=false。
   - 分项 `token_count` 断言 input/output/cache/reasoning 被保留。
3. Unit: `tests/unit/usage-summary.test.ts`
   - usage-data 优先级不变。
   - stats-cache 聚合 token 明细。
   - Codex session fallback 能返回 totalTokens。
   - days 过滤 dailyTokenUsage / dailyCosts。
4. Renderer: `tests/renderer/sessions-pages.test.tsx`
   - Overview / Sessions / Detail 能渲染 total 与 input/output 文案。
   - total-only 数据不渲染假分项。
5. Renderer: Usage 页面测试可放在现有 sessions-pages 或新增 `usage-page.test.tsx`
   - total token card 和 model breakdown 显示 tokens。
6. 门禁:
   - `pnpm harness:check`
   - `pnpm test -- tests/unit/session-meta-parser.test.ts tests/unit/codex-session-parser.test.ts tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx`
   - `pnpm typecheck`

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| TokenUsageBreakdown shared contract | 1 |
| Claude parser tokenUsage | 2 |
| Codex parser tokenUsage | 3 |
| Usage 聚合和 session fallback | 4, 5 |
| TokenUsageDisplay 和页面替换 | 6, 7 |
| CostSource 与 pricing catalog 设计 | 8, 9 |
| 单元测试、渲染测试、门禁 | 10 |
