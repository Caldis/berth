# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加中文 Overview 标签回归测试
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 2026-06-02 扩展中文 Overview 测试, 先确认 `Plugins` 和英文 severity count 仍会出现导致测试失败
- [x] 任务 2: 更新 Overview label i18n
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 2026-06-02 添加 `overview.stats.*` 与 `overview.healthCount.*` locale key, Overview 改用 `t()`; `tests/renderer/overview-health-checks.test.tsx` 通过, 2 tests passed
- [x] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-48-localize-overview-labels`
  - verify: 2026-06-02 `pnpm lint` 通过; `pnpm typecheck:web` 通过; `pnpm harness:check --work docs/works/2026-06-02-gh-48-localize-overview-labels` 通过; `pnpm test` 通过, 57 files / 437 tests

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
