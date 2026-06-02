# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补充 Claude settings schema health check 的 i18n 映射与 en/zh 文案。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx` — 25 passed
  - verify: 中文界面不再出现该检查的 raw 英文主文案。
- [x] 任务 2: 补充 Overview 与 Hooks hover renderer 测试。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx` — 25 passed
  - verify: 两个入口均覆盖 title / message / fix。
- [ ] 任务 3: 完成验证、归档并处理 docs issue。
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; `pnpm harness:issues`
  - verify: `docs/issues/2026-06-02-BUG-localize-claude-settings-schema-health-check.md` 移入 resolved。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
