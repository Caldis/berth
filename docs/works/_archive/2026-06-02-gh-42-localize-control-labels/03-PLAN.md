# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补 Overview 健康检查 action title 的中英文测试。
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 2026-06-02 13:11 先失败并证明硬编码英文; 2026-06-02 13:11 修复后通过, 中文 title 为 `忽略信息检查` / `复制修复片段`, 英文 title 保持原值。
- [x] 任务 2: 补 WindowControls 中英文 accessible name 测试。
  - tests: `pnpm exec vitest run tests/renderer/window-controls.test.tsx`
  - verify: 2026-06-02 13:11 先失败并证明硬编码英文; 2026-06-02 13:11 修复后通过, 中文界面可按 `最小化窗口` / `最大化窗口` / `还原窗口` / `关闭窗口` 查询; 英文界面仍保持原标签。
- [x] 任务 3: 实现 i18n key 和组件调用。
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx tests/renderer/window-controls.test.tsx`
  - verify: 2026-06-02 13:12 `rg "Ignore info check|Copy fix snippet|Minimize window|Maximize window|Restore window|Close window" src/renderer/src tests/renderer` 确认源码无相关硬编码英文, 只剩测试断言。
- [x] 任务 4: 跑标准门禁并按 CI gate 推送。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test`; `pnpm build`; `pnpm test:e2e`; `gh run list`; `gh run watch`
  - verify: 2026-06-02 13:12 `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test`; `pnpm build` 通过。2026-06-02 13:14 `pnpm test:e2e` 通过。2026-06-02 13:15 push 前最近 5 次 master CI 均为 success; 2026-06-02 13:17 `gh run watch 26799976455 --repo Caldis/berth --exit-status` 通过, SHA `79e4b53aef72e82c5c8e8b58d28ceea94ab2e102`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
