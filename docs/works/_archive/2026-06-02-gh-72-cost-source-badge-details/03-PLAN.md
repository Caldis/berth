# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 建立 CostSourceBadge 的 renderer 覆盖
  - tests: `pnpm vitest run tests/renderer/cost-source-badge.test.tsx` - passed, 2 tests.
  - verify: 四种来源都有本地化短标签、`title`、`aria-label`; raw enum 不作为可见文案出现。
- [x] 任务 2: 实现共享 badge 说明并清理 Overview 重复说明
  - tests: `pnpm vitest run tests/renderer/cost-source-badge.test.tsx tests/renderer/overview-health-checks.test.tsx tests/renderer/sessions-pages.test.tsx` - passed, 23 tests.
  - verify: Overview / Usage 共享 tag 均获得 hover 和读屏说明; 常规布局不新增说明块。
- [x] 任务 3: 类型检查、任务态检查和界面实测
  - tests: `pnpm typecheck:web` - passed; `pnpm harness:check --work docs/works/2026-06-02-gh-72-cost-source-badge-details` - passed.
  - verify: dev 实例截图确认 Overview 和 Usage 费用 tag 紧凑显示; DOM 检查确认 `title` / `aria-label` 存在。截图: `%TEMP%\berth-gh72-overview.png`, `%TEMP%\berth-gh72-usage.png`.

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

## 最终验证

- `pnpm harness:prepush` - passed, 65 files / 484 tests.
- `pnpm harness:ci:wait -- --sha 2fa6c333de226ad9707796262047cc2a5d735c26 --timeout 120 --poll 5` - passed, `CI#26822959911`.
- GitHub Issue #72 closed.
- GitHub Project item `PVTI_lAHOADXbEs4BZHvQzguf6Jw` marked Done and verified by `node scripts\harness-projects.mjs done docs\works\2026-06-02-gh-72-cost-source-badge-details`.
