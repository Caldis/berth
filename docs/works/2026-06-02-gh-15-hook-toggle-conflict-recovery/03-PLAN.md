# 任务清单 (Design 产物 / 活清单)

- [x] 任务 1: 补 hooks manager 与 renderer 冲突恢复测试。
  - tests: `pnpm test -- tests/unit/hooks-manager.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 新测试先失败, 实现后通过。已覆盖写前外部修改、目标 Hook 变化、手动恢复和 sidecar 损坏。
- [x] 任务 2: 实现 Claude Hook 三次重试与写前 compare。
  - tests: `pnpm test -- tests/unit/hooks-manager.test.ts`
  - verify: 外部无关修改可重试完成, 目标修改停止写入。已通过。
- [x] 任务 3: 改善 restore point / sidecar / stale 错误文案。
  - tests: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 行内错误可读, 不暴露低层异常。已通过。
- [x] 任务 4: 跑类型检查与 harness 检查。
  - tests: `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check`
  - verify: 类型与任务目录合规。已通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
