# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 修复复制反馈测试等待条件
  - tests: `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx`
  - verify: 2026-06-02 不修改 UI; `Copied` 按钮断言改为等待现有复制反馈状态; `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx` 通过, 17 tests passed
- [ ] 任务 2: 收口检查
  - tests: `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 2026-06-02 `pnpm test` 通过, 57 files / 437 tests; `pnpm harness:check` 通过; `node scripts/harness-projects.mjs check --strict` 通过; 等待修复提交的 GitHub Actions run 结果

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
