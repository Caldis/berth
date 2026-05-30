# 任务清单

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 修 usage 聚合正确性
  - 修 `stats-cache.dailyModelTokens` 日期语义。
  - 支持 usage-data / stats-cache / session 按 agent 来源合并。
  - byModel / byProject 百分比按 tokens。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts`, `pnpm typecheck:node`。
- [x] 任务 2: 修 Usage agentView 与 unknown token 显示
  - Usage 页面传 `agentView`。
  - `TokenUsageDisplay` compact/detail/tooltip 显示 `unknownTokens`。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`。
- [ ] 任务 3: pricing catalog 转换与 local override
  - 增加 LiteLLM / models.dev 转换纯函数。
  - 增加 generated snapshot 文件和 update script。
  - 增加 local override loader 与模型 normalization。
  - 验证: `pnpm test -- tests/unit/pricing.test.ts`, `pnpm typecheck:node`。
- [ ] 任务 4: cost resolution 明细与 pricing misses
  - 扩展 `UsageCostResolution`, `UsageSummary`, byModel/byProject。
  - 输出 actual/estimated/delta 和 `pricingMisses`。
  - 验证: `pnpm test -- tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts`, `pnpm typecheck:node`。
- [ ] 任务 5: Usage UI 口径展示
  - 新增 `CostSourceBadge`。
  - Usage 显示 unknown pricing notice、pricing gaps、actual vs estimated 差异。
  - i18n en/zh 同步。
  - 验证: renderer 测试 + `pnpm typecheck:web`。
- [ ] 任务 6: 总验证
  - `pnpm harness:check`
  - `pnpm test`
  - `pnpm typecheck`

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
