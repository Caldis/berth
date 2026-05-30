# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

### Usage summary 归一化

新增 `src/shared/usage-summary.ts`:

- `emptyUsageSummary()`
- `normalizeUsageSummary(value: unknown): UsageSummary`
- `normalizeUsageModelBreakdown()`
- `normalizeUsageProjectBreakdown()`

主进程 `buildUsageSummary()` 返回前调用一次, renderer `Usage` 接收 IPC 后也调用一次, 形成跨进程防线。对应验收标准: 1。

### Cost mode

在 `src/shared/types/asset.ts` 增加:

```ts
export type CostMode = 'auto' | 'actual' | 'estimated'
```

语义:

- `auto`: 有真实成本用真实成本, 否则用估算成本。不同桶混用时为 `mixed`。
- `actual`: 展示真实成本; 缺真实成本的记录成本为 0, source 为 `unknown`。
- `estimated`: 展示 catalog 估算成本; 缺 catalog、缺 token 明细或缺价格分量时成本为 0, source 为 `unknown`。

`actualCost`, `estimatedCost`, `costDelta` 仍作为辅助信息保留。`totalCost`, `dailyCosts`, `byModel.cost`, `byProject.cost` 使用当前 cost mode 的展示口径。对应验收标准: 2。

### Cost explanation

在 `src/shared/types/asset.ts` 增加:

```ts
export type UsageCostFormula = 'actual' | 'estimated' | 'mixed' | 'unknown'
export type PricingSourceName = 'litellm' | 'models.dev' | 'local'

export interface UsagePricingSourceSummary {
  source: PricingSourceName
  sourceUrl?: string
  updatedAt?: string
  count: number
}

export interface PricingCatalogInfo {
  generatedAt?: string
  sources: { name: PricingSourceName; url: string; fetchedAt: string }[]
}

export interface UsageCostExplanation {
  formula: UsageCostFormula
  pricingSources: UsagePricingSourceSummary[]
  catalog: PricingCatalogInfo
}
```

`UsageSummary` 增加 `costMode` 和 `costExplanation`。Renderer 只显示解释摘要, 不接收完整 catalog。对应验收标准: 3, 7。

### Pricing gap

保留现有 `PricingMiss`, 不在第一轮扩成更复杂对象。Renderer 根据 `reason` 生成说明:

- `missing-model-pricing`: 价格表没有命中模型, 可用 local override 补模型价格。
- `missing-token-breakdown`: 只有 total tokens, 无法从 override 修复。
- `missing-price-component`: 模型命中, 但缺 cache read/cache write/reasoning 等分量价格, 可用 local override 补字段。

对应验收标准: 4。

## 模块结构 / 组件拆分

### Shared

- `src/shared/types/asset.ts`
  - 增加 cost mode、cost explanation 和 catalog info 类型。
  - 扩展 `UsageSummary`。
- `src/shared/usage-summary.ts`
  - 从 `Usage` 页移出 legacy normalization。
  - 供 main 和 renderer 共用。
- `src/shared/token-usage.ts`
  - 增加 `tokenUsageSegments()` 之类纯函数, 用于 UI 显示结构占比。

### Main process

- `src/main/engine/pricing/types.ts`
  - `UsageCostInput` 增加 `costMode`。
  - `UsageCostResolution` 增加 `formula` 和可选 `pricing` 继续用于汇总解释。
- `src/main/engine/pricing/estimate.ts`
  - 实现 `auto / actual / estimated`。
  - reasoning token 默认按 output 单价估算, 与 OpenAI 官方说明保持一致。
- `src/main/engine/pricing/catalog.ts`
  - 增加 `getBuiltInPricingCatalogInfo()`。
- `src/main/engine/usage.ts`
  - `UsageSummaryOptions` 增加 `costMode`。
  - 汇总 pricing source、catalog info、formula。
  - 返回前调用 `normalizeUsageSummary()`。
- `src/main/ipc/handlers.ts`
  - 透传 `opts.costMode`。

### Preload / IPC

- `src/shared/types/ipc.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`

同步 `usage.summary` 参数为 `{ days, agentView?, costMode? }`。

### Renderer

- `src/renderer/src/pages/usage.tsx`
  - cost mode segmented control。
  - IPC 失败状态。
  - cost explanation 横向说明区。
  - pricing gap 按 reason 展示说明和 override 示例。
  - token structure 区块。
- `src/renderer/src/components/layout/page-error-boundary.tsx`
  - class error boundary, fallback 包含重试和返回 Overview。
- `src/renderer/src/App.tsx`
  - 仅包 `/usage` route。
- `src/renderer/src/i18n/locales/en.json`
- `src/renderer/src/i18n/locales/zh.json`

补齐 UI 文案。对应验收标准: 4, 5, 6。

## 测试策略

1. Unit: `tests/unit/usage-summary-normalizer.test.ts`
   - legacy `UsageSummary` 缺新字段时能补默认值。
   - byModel/byProject 缺 `pricingMisses` / `tokenUsage` 时能补默认值。
2. Unit: `tests/unit/pricing.test.ts`
   - `auto` 保持现有行为。
   - `actual` 只展示真实成本。
   - `estimated` 忽略真实成本并展示估算成本。
   - reasoning token 默认按 output 单价。
3. Unit: `tests/unit/usage-summary.test.ts`
   - cost mode 会同步影响 total/daily/model/project cost。
   - summary 输出 `costMode` 和 `costExplanation.pricingSources`。
4. Renderer: `tests/renderer/sessions-pages.test.tsx`
   - Usage cost mode 点击后 IPC 参数变化。
   - pricing gap reason 和 override 示例显示。
   - IPC reject 显示错误态。
5. Renderer: 新增 `tests/renderer/page-error-boundary.test.tsx`
   - route-level error boundary 显示 fallback, sidebar 外壳不参与测试。
6. 门禁:
   - `pnpm harness:check`
   - `pnpm test -- tests/unit/usage-summary-normalizer.test.ts tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx tests/renderer/page-error-boundary.test.tsx`
   - `pnpm typecheck`
   - 可选: `pnpm build`, `pnpm test:e2e -- tests/e2e/app.e2e.ts -g "can navigate to usage"`。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| shared UsageSummary normalization | 1 |
| CostMode 契约和 main 聚合口径 | 2 |
| UsageCostExplanation 与 catalog info | 3, 7 |
| Pricing gap reason 文案和 override 示例 | 4 |
| Token structure 派生展示 | 5 |
| Usage IPC 错误态和 route ErrorBoundary | 6 |
| 单测、渲染测试、门禁 | 8, 9 |
