# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补 recovery loading label 中英文测试。
  - tests: `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 2026-06-02 13:24 先失败并证明 DOM 仍为 `Loading hook recoveries`; 修复后 `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 中文界面可查询 `正在加载 Hook 恢复记录`。
- [x] 任务 2: 实现 i18n key 和组件调用。
  - tests: `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 2026-06-02 13:25 `rg --fixed-strings "Loading hook recoveries" src/renderer/src tests/renderer/hooks-lifecycle-view.test.tsx` 确认源码里只剩 en locale, 测试里只剩负断言。
- [ ] 任务 3: 跑标准门禁并按 CI gate 推送。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test`; `pnpm build`; `pnpm test:e2e`; `gh run list`; `gh run watch`
  - verify: 2026-06-02 13:25 `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test`; `pnpm build`; `pnpm test:e2e` 均通过; 等待 push 前 CI 检查和 push 后新 SHA CI。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
