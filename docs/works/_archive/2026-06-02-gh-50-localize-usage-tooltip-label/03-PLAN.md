# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加中文 Usage 成本文案回归测试
  - tests: `pnpm exec vitest run tests/renderer/usage-tooltip-label.test.tsx`
  - verify: 2026-06-02 新增 `tests/renderer/usage-tooltip-label.test.tsx`; 首次运行失败, 收到 `Cost`, 期望 `费用`
- [x] 任务 2: 使用 i18n label 修复 tooltip formatter
  - tests: `pnpm exec vitest run tests/renderer/usage-tooltip-label.test.tsx`; `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx`
  - verify: 2026-06-02 新增 `usage.cost` en/zh key, tooltip formatter 改用 `t('usage.cost')`; `usage-tooltip-label.test.tsx` 通过, 1 test passed; `sessions-pages.test.tsx` 通过, 17 tests passed
- [x] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 2026-06-02 `pnpm lint` 通过; `pnpm typecheck:web` 通过; `pnpm test` 通过, 58 files / 438 tests; `pnpm harness:check` 通过; `node scripts/harness-projects.mjs check --strict` 通过; GitHub Actions run 26803864753 通过

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
