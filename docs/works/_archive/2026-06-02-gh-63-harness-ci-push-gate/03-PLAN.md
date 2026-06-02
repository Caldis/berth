# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增 `scripts/harness-ci-gate.mjs` 和 `tests/harness/ci-gate.test.ts`
  - tests: `pnpm vitest run tests/harness/ci-gate.test.ts` (10 passed)
  - verify: 非 UI 任务; CLI 输出包含 workflow、run id、SHA、URL 和失败原因
- [x] 任务 2: 增加 package scripts 与 workflow 文档引用
  - tests: `pnpm harness:check` (passed)
  - verify: 非 UI 任务; `package.json` 暴露 baseline / wait / prepush 命令
- [x] 任务 3: 用 harness-check 防止 CI gate 规则回退
  - tests: `pnpm vitest run tests/harness/check.test.ts` (38 passed); `pnpm harness:check` (passed)
  - verify: 非 UI 任务; 删除关键命令引用时 harness-check 会报错

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
