# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新 harness 子代理门禁规则与自检
  - tests: `pnpm test -- tests/harness/check.test.ts` (45 passed, 2026-06-03); `pnpm harness:check` (passed, 2026-06-03)
  - verify: 不适用 UI; workflow/tools 已写明 CI wait / Project 同步可由子代理执行, 主 Agent 仍需消费成功结果。
- [x] 任务 2: 优化 Vitest 环境分配
  - tests: `/usr/bin/time -p pnpm test` (83 files / 599 tests passed, real 12.05s, duration 11.35s, 2026-06-03)
  - verify: 不适用 UI; renderer 测试匹配 jsdom, unit/harness 默认 node; environment 累计为 26.62s。
- [ ] 任务 3: 采样 prepush 并更新任务证据
  - tests: `/usr/bin/time -p pnpm harness:prepush`
  - verify: 不适用 UI; 记录优化前后耗时与剩余主要成本。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
