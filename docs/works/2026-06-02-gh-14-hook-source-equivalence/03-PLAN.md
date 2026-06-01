# 任务清单 (Design 产物 / 活清单)

- [x] 任务 1: 补 scanner / lifecycle / renderer 测试。
  - tests: `pnpm test -- tests/unit/engine-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 新测试先失败, 实现后通过。已验证失败点为 scanner 未写 `equivalentSources`, lifecycle / UI 未展示 `effectiveEnabled`。
- [x] 任务 2: 实现 scanner 等价来源标注。
  - tests: `pnpm test -- tests/unit/engine-scanner.test.ts`
  - verify: 同组 hook meta 含 equivalentSources / equivalentSourceCount / effectiveEnabled。已通过。
- [x] 任务 3: 实现 lifecycle 风险提示与行内 source/effective tag。
  - tests: `pnpm test -- tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 禁用当前 source 但其他 source 生效时, UI 有提示。已通过。
- [x] 任务 4: 跑类型检查和 harness 检查。
  - tests: `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm harness:check`
  - verify: 类型与任务目录合规。已通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
