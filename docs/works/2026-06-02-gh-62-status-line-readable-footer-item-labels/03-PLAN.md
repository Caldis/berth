# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 确认 status line card/default footer 的真实渲染路径和 Codex known item 集合。
  - tests: 不适用
  - verify: 已读 `capabilities.tsx`、`codex/parsers.ts`
- [x] 任务 2: 新增可读 item label helper 和 i18n。
  - tests: `pnpm vitest run tests/renderer/status-line-section.test.tsx`
  - verify: 已知项显示 label，title 保留 raw id
- [x] 任务 3: 更新 status line renderer 测试。
  - tests: `pnpm vitest run tests/renderer/status-line-section.test.tsx`
  - verify: unknown item 继续 raw
- [x] 任务 4: 跑目标测试、typecheck 和 harness check。
  - tests: `pnpm vitest run tests/renderer/status-line-section.test.tsx`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-62-status-line-readable-footer-item-labels`
  - verify: 已通过

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

## verify 记录
- `pnpm vitest run tests/renderer/status-line-section.test.tsx` — 8 tests passed
- `pnpm typecheck:web` — passed
- `pnpm harness:check --work docs/works/2026-06-02-gh-62-status-line-readable-footer-item-labels` — passed
