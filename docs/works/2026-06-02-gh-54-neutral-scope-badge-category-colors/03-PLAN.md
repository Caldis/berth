# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 扩展 ScopeBadge palette 回归测试
  - tests: `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx`
  - verify: 测试先失败, 能捕获 user/project/enterprise 的彩色 class。
  - evidence: 2026-06-02 目标测试先失败, 2 tests failed; `ScopeBadge` 的 user/project/enterprise 仍含 `blue`/`green`/`purple` class。
- [x] 任务 2: 改为统一中性 scope badge
  - tests: `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx`
  - verify: 所有 scope 文本仍渲染, class 不含 blue/green/purple/orange。
  - evidence: 2026-06-02 目标测试通过, 2 tests passed; shared `ScopeBadge` 使用统一 zinc 中性色, Instructions 无本地 ScopeBadge 颜色表。
- [ ] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含 GitHub Actions run 结果。
  - evidence: 2026-06-02 本地通过 `pnpm lint`, `pnpm typecheck:web`, `pnpm typecheck:node`, `pnpm test` (60 files, 443 tests), `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
