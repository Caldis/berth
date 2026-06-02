# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 复现并确认 warning 来源
  - tests: `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx`
  - verify: 2026-06-02 复现通过: 16 tests passed, 输出包含多段 Recharts zero-size warning; UI 不适用
- [x] 任务 2: 在 `tests/setup.ts` 补充 jsdom 尺寸与 ResizeObserver 模拟
  - tests: `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx`
  - verify: 2026-06-02 通过: 16 tests passed, 输出不再包含 Recharts zero-size warning; UI 不适用
- [x] 任务 3: 收口类型与 harness 检查
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-44-silence-recharts-test-warnings`
  - verify: 2026-06-02 `pnpm test` 通过, 56 files / 434 tests; `pnpm typecheck:web` 通过; `pnpm lint` 通过; `pnpm harness:check --work docs/works/2026-06-02-gh-44-silence-recharts-test-warnings` 通过; push 后 GitHub Actions run 26800789209 通过; UI 不适用

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
