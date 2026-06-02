# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加 session scope badge palette 回归测试
  - tests: `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx`
  - verify: 测试先失败, 能捕获 session badge 的 orange class
  - evidence: 2026-06-02 目标测试先失败, 2 tests failed; shared `ScopeBadge` 和 Instructions 本地 scope badge 都含 `orange` class。
- [x] 任务 2: 改为中性 session badge 并复用 shared 组件
  - tests: `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx`
  - verify: Instructions 保持 rounded pill 视觉, 不再重复颜色表
  - evidence: 2026-06-02 目标测试通过, 2 tests passed; session badge 使用 zinc 色值, Instructions 复用 shared `ScopeBadge`。
- [x] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含 GitHub Actions run 结果
  - evidence: 2026-06-02 本地通过 `pnpm lint`, `pnpm typecheck:web`, `pnpm typecheck:node`, `pnpm test` (60 files, 443 tests), `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`; push 前 Actions 基线最新 5 次均为 success, 最新 run 26805296056; commit `f16a2ef` 对应 CI run 26805718041 success。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
