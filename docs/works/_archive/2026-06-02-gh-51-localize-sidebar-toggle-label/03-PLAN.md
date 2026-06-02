# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加中文 Sidebar 折叠按钮 label 测试
  - tests: `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx`
  - verify: 不修改布局; 测试覆盖折叠前后 accessible label
  - evidence: 2026-06-02 目标测试先失败, 中文环境下折叠按钮 accessible name 仍为 `Collapse sidebar`, 未找到 `折叠侧边栏`。
- [x] 任务 2: 使用 i18n 修复 Sidebar 折叠按钮 label
  - tests: `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx`
  - verify: 不修改布局; icon-only button label 与语言一致
  - evidence: 2026-06-02 `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` 通过, 3 tests passed。
- [x] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含 GitHub Actions run 结果
  - evidence: 2026-06-02 本地检查通过: `pnpm lint`; `pnpm typecheck:web`; `pnpm test` (58 files, 439 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`。
  - evidence: GitHub Actions run `26804348379` passed for commit `187a50c`。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
