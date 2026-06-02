# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新 renderer 测试, 先锁定新 Usage 信息结构
  - tests: `pnpm test tests/renderer/sessions-pages.test.tsx tests/renderer/usage-tooltip-label.test.tsx` 先应暴露旧 UI 不符合新断言。
  - verify: 测试覆盖费用口径 select、模型费用/source 展示、来源说明、删除 rate limits/experimental flags。
- [x] 任务 2: 重构 `src/renderer/src/pages/usage.tsx` 的页面结构
  - tests: `pnpm test tests/renderer/sessions-pages.test.tsx tests/renderer/usage-tooltip-label.test.tsx`
  - verify: 首屏包含费用摘要、token 摘要、来源说明和模型明细入口; 费用口径 select 可切换并刷新 IPC; 旧空卡片不再出现。
- [x] 任务 3: 更新 Usage i18n 文案
  - tests: `pnpm test tests/renderer/sessions-pages.test.tsx tests/renderer/usage-tooltip-label.test.tsx`
  - verify: 中英文 key 对齐; 文案明确本地扫描/价格快照/真实账单边界。
- [x] 任务 4: 跑目标单元和页面检查
  - tests: `pnpm test tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts tests/unit/usage-summary-normalizer.test.ts tests/renderer/sessions-pages.test.tsx tests/renderer/usage-tooltip-label.test.tsx`
  - verify: `pnpm harness:prepush` 已覆盖全部 vitest; Usage renderer 相关断言通过, 费用汇总逻辑未退化。
- [x] 任务 5: 跑类型、构建、harness 和截图验收
  - tests: `pnpm typecheck:web`; `pnpm build`; `pnpm harness:check`
  - verify: `pnpm typecheck:web`; `pnpm build`; `pnpm harness:check`; `pnpm harness:prepush`; `pnpm harness:ci:wait -- --sha cc4335a868a50e713e07572ac30eef984325f979`; dev agent `gh84-usage` + CDP 断言 + `print-window` 截图 `C:\Users\mail\AppData\Local\Temp\berth-gh84-usage-print.png`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
