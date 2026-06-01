# 技术方案

每条回指 01-ANALYSIS 验收标准编号。

## 数据契约

### Pricing catalog

新增内部 snapshot 数据结构:

```ts
export interface PricingCatalogSnapshot {
  version: number
  generatedAt: string
  sources: PricingCatalogSource[]
  models: ModelPricing[]
}

export interface PricingCatalogSource {
  name: 'litellm' | 'models.dev' | 'local'
  url?: string
  fetchedAt?: string
  commit?: string
}
```

`ModelPricing` 扩展:
- `id`: canonical `provider/model` id, 用于精准匹配。
- `model`: provider 原始模型 id。
- `provider`: provider id。
- `aliases`: 受控 alias。
- `contextWindow` / `maxOutputTokens`: 从 LiteLLM 或 models.dev 补充。
- `pricingUnit`: 内部始终存 per token, 导入层负责换算。
- `sourceUrl`, `updatedAt`。

local override 使用 JSON:

```json
{
  "models": [
    {
      "id": "anthropic/claude-sonnet-4-20250514",
      "inputCostPerToken": 0.000003,
      "outputCostPerToken": 0.000015,
      "cacheReadInputCostPerToken": 0.0000003,
      "cacheCreationInputCostPerToken": 0.00000375
    }
  ]
}
```

优先级:
1. local override。
2. generated LiteLLM snapshot。
3. models.dev 补充字段。
4. 未命中进入 `pricingMisses`。

对应验收: 1, 2, 3。

### Cost resolution

扩展 `UsageCostResolution`:

```ts
export interface UsageCostResolution {
  cost: number
  source: CostSource
  estimatedCost?: number
  actualCost?: number
  delta?: number
  pricing?: ModelPricing
  reason?: PricingMissReason
}
```

规则:
- 有真实 cost 时 `cost=actualCost`, `source='actual'`。
- 如果也能估算, 同时输出 `estimatedCost` 和 `delta=actual-estimated`。
- 无真实 cost 但能估算时 `source='estimated'`。
- 缺模型价格、缺 token 明细、缺价格分量时 `unknown` 并写 reason。

对应验收: 7, 8, 9。

### UsageSummary

扩展 shared 类型:

```ts
export interface PricingMiss {
  model: string
  reason: PricingMissReason
  tokens: number
  costSource: CostSource
}
```

`UsageSummary.byModel[]` / `byProject[]` 增加:
- `costSource`
- `estimatedCost?`
- `actualCost?`
- `costDelta?`

`UsageSummary` 增加:
- `pricingMisses: PricingMiss[]`
- `estimatedCost?: number`
- `actualCost?: number`
- `costDelta?: number`

第一轮不强制 `SessionSummary.costSource`, 因为 session list/detail 当前没有每条 session 的估算输入; 可在后续按 session 维度补。

对应验收: 7, 8, 9。

## 模块结构

### `src/main/engine/pricing/`

- `types.ts`: 扩展类型。
- `model-match.ts`: `normalizeModelId()`, `modelMatchKeys()`, provider prefix / Bedrock region / alias 处理。
- `catalog.ts`: 从 generated snapshot + local override 组装 catalog; renderer 不直接访问。
- `estimate.ts`: 返回 actual + estimated + delta; 不在此做 UI 文案。
- `convert-litellm.ts`: 纯函数, 将 LiteLLM 原始 JSON 转 `ModelPricing[]`。
- `convert-models-dev.ts`: 纯函数, 将 models.dev JSON 转补充 pricing/limit 信息。

对应验收: 1, 2, 3, 9。

### `scripts/update-pricing-catalog.mjs`

开发/CI 脚本, 不在运行时调用。

职责:
1. fetch LiteLLM raw JSON。
2. 可选 fetch models.dev API JSON。
3. 调用转换器生成 `src/main/engine/pricing/catalog.generated.json`。
4. 写入 `generatedAt`, `sourceUrl`, `fetchedAt`。
5. 对样例模型做 smoke check。

对应验收: 1。

### `src/main/engine/usage.ts`

修复:
- `stats-cache.dailyModelTokens` 保留 date -> tokenUsage, 不把 model 当 date。
- usage-data / stats-cache / sessions 按 agent 来源合并, 不因存在一个 usage-data 就跳过其他 agent。
- byModel / byProject token 百分比固定按 tokens。
- 收集 `pricingMisses`, bucket cost source, actual/estimated/delta。

对应验收: 4, 5, 7, 9。

### Renderer

- `TokenUsageDisplay`: 显示 `unknownTokens`。
- `CostSourceBadge`: shared component, compact badge + tooltip 文案。
- `Usage`: 传 `agentView`; 显示 cost source badge、pricing gaps、actual/estimated delta。
- `Overview`: 保留轻量口径, unknown cost 用缺定价空态, 不塞完整 gaps 表。
- i18n en/zh 补齐 key。

对应验收: 6, 8, 9。

## 测试策略

1. pricing unit:
   - LiteLLM fixture 字段转换为 per-token。
   - models.dev fixture 从 per-million 转 per-token。
   - local override 覆盖内置。
   - provider prefix / Bedrock prefix / alias 匹配。
   - actual + estimate 同时输出 delta。
2. usage unit:
   - stats-cache daily token 日期正确。
   - Claude usage-data + Codex session 同时汇总。
   - token percentage 固定按 tokens。
   - pricingMisses 聚合并去重/累加 tokens。
3. renderer:
   - Usage 传 agentView。
   - cost source badge / unknown notice / pricing gaps 可见。
   - unknown tokens 在 compact/detail 出现。
   - unknown cost 不显示 `$0.00`。
4. 门禁:
   - 每个独立阶段跑目标测试与 typecheck 后提交。
   - 最后跑 `pnpm harness:check`, `pnpm test`, `pnpm typecheck`。如果全局 harness 被并行任务阻塞, 需说明阻塞项。

## 不做

- 不在用户打开 Usage 页时联网刷新价格表。
- 不把估算成本显示成真实账单。
- 不做未标记的 fuzzy match。
- 不处理企业折扣、Claude subscription、OpenRouter markup、Bedrock/Vertex 区域价的最终账单归因; 这些只在 UI 文案中标注为估算风险。
