# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加 lifecycle sidebar 当前阶段状态和 `aria-current`
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` (25 passed)
  - verify: 当前项有 `aria-current="true"` 和稳定选中样式; 点击仍滚动
- [x] 任务 2: 验证任务产物和整体类型安全
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-64-hooks-lifecycle-current-stage-semantics` (passed); `pnpm typecheck:web` (passed)
  - verify: UI 改动只触碰 hooks lifecycle 组件和对应测试

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
