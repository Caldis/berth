# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 主进程 All 口径回归测试
  - 在 `tests/unit/usage-summary.test.ts` 增加 `days: 0` 全量累计测试, 先确认当前实现通过或失败状态。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts` 通过, 11 tests passed。
- [ ] 任务 2: Renderer 默认 All 与时间范围交互
  - 在 `tests/renderer/sessions-pages.test.tsx` 更新默认请求断言, 并覆盖 30 天与 All 按钮传参。
  - 先跑测试看到当前实现失败, 再改 `src/renderer/src/pages/usage.tsx`。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx`。
- [ ] 任务 3: 阶段收口
  - 跑目标测试、web/node typecheck、harness check。
  - 更新本清单和 INDEX.phase 到 verify。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`, `pnpm typecheck:node`, `pnpm harness:check`。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
