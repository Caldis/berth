# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 确认 Memory importance badge 和 filter chip 的真实渲染路径。
  - tests: 不适用
  - verify: 已读 `memory-view.tsx`
- [x] 任务 2: 新增 importance label i18n 并替换 badge/filter 展示。
  - tests: `pnpm vitest run tests/renderer/memory-view.test.tsx`
  - verify: badge 和 chip 使用 label，title 使用 hint
- [x] 任务 3: 更新英文/中文 renderer 测试。
  - tests: `pnpm vitest run tests/renderer/memory-view.test.tsx`
  - verify: 英文、中文都不把 enum 当主要标签
- [x] 任务 4: 跑目标测试、typecheck 和 harness check。
  - tests: `pnpm vitest run tests/renderer/memory-view.test.tsx`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-61-memory-readable-importance-labels`
  - verify: 已通过

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

## verify 记录
- `pnpm vitest run tests/renderer/memory-view.test.tsx` — 6 tests passed
- `pnpm typecheck:web` — passed
- `pnpm harness:check --work docs/works/2026-06-02-gh-61-memory-readable-importance-labels` — passed
